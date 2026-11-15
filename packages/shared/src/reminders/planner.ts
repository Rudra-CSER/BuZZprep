import { DateTime } from 'luxon';
import type { ActivityCategory, ReminderKind } from '../constants';
import { isActive, isTrackable, type Occurrence } from '../schedule';
import {
  addDays,
  eachDate,
  type LocalDate,
  localTimeOf,
  logicalDateOf,
  logicalDateTime,
  occursOn,
  type TimeContext,
  toISO,
} from '../time';
import { KIND_URL, occurrenceUrl } from './links';
import { isWithinDailyRange } from './preferences';
import { activityText, timeText } from './text';
import type {
  NotificationPlanInput,
  PlannedNotification,
  ReminderRule,
  SuppressedReason,
} from './types';

/**
 * Reminder planning
 * -----------------
 * Reminder *rules* (stored per user) are turned into concrete, time-stamped notifications for
 * a rolling window. The server stores those in a durable outbox (MongoDB) and a dispatcher
 * sends due rows over Web Push. Nothing here relies on timers in the browser.
 */

const DELIVERY: Record<ReminderKind, { urgency: PlannedNotification['urgency']; ttl: number }> = {
  upcoming: { urgency: 'high', ttl: 15 * 60 },
  start: { urgency: 'high', ttl: 15 * 60 },
  overdue: { urgency: 'normal', ttl: 60 * 60 },
  missed_digest: { urgency: 'normal', ttl: 4 * 3600 },
  daily_planning: { urgency: 'normal', ttl: 2 * 3600 },
  journal: { urgency: 'normal', ttl: 2 * 3600 },
  sleep: { urgency: 'high', ttl: 30 * 60 },
  weekly_review: { urgency: 'low', ttl: 12 * 3600 },
  milestone: { urgency: 'normal', ttl: 12 * 3600 },
  custom: { urgency: 'normal', ttl: 60 * 60 },
};

export function planNotifications(input: NotificationPlanInput): PlannedNotification[] {
  const { prefs, ctx } = input;
  const fromMs = Date.parse(input.from);
  const toMs = Date.parse(input.to);
  const inWindow = (ms: number) => ms >= fromMs && ms < toMs;
  const out: PlannedNotification[] = [];

  const suppression = (
    rule: ReminderRule,
    fireAt: DateTime,
    category: ActivityCategory | null,
  ): SuppressedReason => {
    if (!prefs.enabled) return 'notifications_disabled';
    if (prefs.kinds[rule.kind] === false) return 'kind_disabled';
    if (category && prefs.mutedCategories.includes(category)) return 'category_muted';
    if (
      prefs.quietHours.enabled &&
      !rule.bypassQuietHours &&
      isWithinDailyRange(
        localTimeOf(fireAt, ctx.zone),
        prefs.quietHours.start,
        prefs.quietHours.end,
      )
    ) {
      return 'quiet_hours';
    }
    return null;
  };

  const push = (
    rule: ReminderRule,
    fireAt: DateTime,
    keyPart: string,
    fields: Pick<
      PlannedNotification,
      'activityId' | 'occurrenceDate' | 'title' | 'body' | 'url' | 'tag' | 'condition'
    > & { category: ActivityCategory | null; maxLatenessSeconds?: number },
  ) => {
    const delivery = DELIVERY[rule.kind];
    const iso = toISO(fireAt);
    out.push({
      dedupeKey: `${rule.id}:${keyPart}@${iso}`,
      reminderId: rule.id,
      kind: rule.kind,
      fireAt: iso,
      activityId: fields.activityId,
      occurrenceDate: fields.occurrenceDate,
      title: rule.title?.trim() || fields.title,
      body: rule.body?.trim() || fields.body,
      url: fields.url,
      tag: fields.tag,
      condition: fields.condition,
      urgency: delivery.urgency,
      ttlSeconds: delivery.ttl,
      maxLatenessSeconds: fields.maxLatenessSeconds ?? delivery.ttl,
      suppressedReason: suppression(rule, fireAt, fields.category),
    });
  };

  const occurrencesByActivity = new Map<string, Occurrence[]>();
  for (const o of input.occurrences) {
    const list = occurrencesByActivity.get(o.activityId) ?? [];
    list.push(o);
    occurrencesByActivity.set(o.activityId, list);
  }

  for (const rule of input.reminders) {
    if (!rule.enabled) continue;

    if (rule.anchor === 'activity_start' || rule.anchor === 'activity_end') {
      if (!rule.activityId) continue;
      for (const occ of occurrencesByActivity.get(rule.activityId) ?? []) {
        if (!isActive(occ) || occ.status === 'completed') continue;
        // Optional (mode-relaxed) sessions get a single gentle nudge at most.
        if (occ.modeAction === 'optional' && rule.kind !== 'start' && rule.kind !== 'sleep')
          continue;
        const anchor = DateTime.fromISO(rule.anchor === 'activity_start' ? occ.start : occ.end);
        const fireAt = anchor.plus({ minutes: rule.offsetMinutes });
        if (!inWindow(fireAt.toMillis())) continue;
        const text = activityText(rule, occ, prefs.hour12);
        const startMs = Date.parse(occ.start);
        push(rule, fireAt, `${occ.activityId}:${occ.date}`, {
          activityId: occ.activityId,
          occurrenceDate: occ.date,
          ...text,
          url: occurrenceUrl(occ.activityId, occ.date),
          tag: `occ:${occ.activityId}:${occ.date}`,
          condition: isTrackable(occ) ? 'occurrence_pending' : null,
          category: occ.category,
          // An "upcoming" reminder that can no longer arrive before the start is pointless.
          maxLatenessSeconds:
            rule.kind === 'upcoming'
              ? Math.max(60, Math.round((startMs - fireAt.toMillis()) / 1000))
              : undefined,
        });
      }
      continue;
    }

    if (rule.anchor === 'time') {
      if (!rule.time || !rule.recurrence) continue;
      for (const date of logicalDatesInWindow(fromMs, toMs, ctx)) {
        if (!occursOn(rule.recurrence, date)) continue;
        const fireAt = logicalDateTime(date, rule.time, ctx);
        if (!inWindow(fireAt.toMillis())) continue;
        const text = timeText(rule.kind);
        push(rule, fireAt, date, {
          activityId: null,
          occurrenceDate: date,
          ...text,
          url: KIND_URL[rule.kind] ?? '/',
          tag: `${rule.kind}:${date}`,
          condition: rule.kind === 'missed_digest' ? 'missed_exists' : null,
          category: null,
        });
      }
      continue;
    }

    if (rule.anchor === 'milestone') {
      if (!rule.time) continue;
      for (const m of input.milestones ?? []) {
        if (m.completed) continue;
        for (const daysBefore of rule.daysBefore ?? [0]) {
          const date = addDays(m.dueDate, -daysBefore);
          const fireAt = logicalDateTime(date, rule.time, ctx);
          if (!inWindow(fireAt.toMillis())) continue;
          push(rule, fireAt, `${m.id}:${daysBefore}`, {
            activityId: null,
            occurrenceDate: date,
            title:
              daysBefore === 0
                ? `Milestone due today: ${m.title}`
                : `Milestone in ${daysBefore} day${daysBefore === 1 ? '' : 's'}: ${m.title}`,
            body: 'Check your progress and adjust the plan if you need to.',
            url: KIND_URL.milestone!,
            tag: `milestone:${m.id}`,
            condition: null,
            category: null,
          });
        }
      }
    }
  }

  return out.sort((a, b) => a.fireAt.localeCompare(b.fireAt));
}

function logicalDatesInWindow(fromMs: number, toMs: number, ctx: TimeContext): LocalDate[] {
  const first = logicalDateOf(fromMs, ctx);
  const last = logicalDateOf(toMs, ctx);
  return eachDate(addDays(first, -1), last);
}
