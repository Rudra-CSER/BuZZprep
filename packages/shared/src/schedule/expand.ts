import type { DateTime } from 'luxon';
import { PRIORITIES, type Priority, type ScheduleMode } from '../constants';
import {
  calendarDateFor,
  diffDays,
  eachDate,
  fromLogicalMinutes,
  type LocalDate,
  type LocalTime,
  logicalDateTime,
  occursOn,
  parseTime,
  type TimeContext,
  toISO,
  toLogicalMinutes,
  zonedDateTime,
} from '../time';
import { DEFAULT_MODE_RULES, type ModeRules, resolveModeAction, shortenedDuration } from './modes';
import type { ActivityTemplate, Occurrence, OccurrenceState } from './types';

/**
 * Schedule engine
 * ---------------
 * Activities are *templates* with a recurrence. They are expanded into virtual occurrences
 * on demand; only occurrences that carry state (completed / skipped / moved / notes) are
 * persisted. This is the same "series + exceptions" model calendar apps use, and it lets a
 * mode switch (Busy, Low energy, Recovery) reshape a day without touching the template.
 */

export function occurrenceKey(activityId: string, date: LocalDate): string {
  return `${activityId}:${date}`;
}

export function parseOccurrenceKey(key: string): { activityId: string; date: LocalDate } {
  const idx = key.lastIndexOf(':');
  return { activityId: key.slice(0, idx), date: key.slice(idx + 1) };
}

/** Start time and duration for a given date, applying any gradual progression. */
export function activityTiming(
  activity: Pick<ActivityTemplate, 'startTime' | 'durationMinutes' | 'progression'>,
  date: LocalDate,
  ctx: TimeContext,
): { startTime: LocalTime; durationMinutes: number } {
  const p = activity.progression;
  if (!p || p.stepMinutes <= 0) {
    return { startTime: activity.startTime, durationMinutes: activity.durationMinutes };
  }
  const b = ctx.dayBoundaryMinutes;
  const target = toLogicalMinutes(activity.startTime, b);
  const from = toLogicalMinutes(p.fromTime, b);
  const steps =
    date < p.startDate ? 0 : Math.floor(diffDays(p.startDate, date) / Math.max(1, p.everyDays));
  const delta = target - from;
  const moved = Math.sign(delta) * Math.min(Math.abs(delta), steps * p.stepMinutes);
  const start = from + moved;
  let duration = activity.durationMinutes;
  if (p.keepEnd) duration = Math.max(0, target + activity.durationMinutes - start);
  return { startTime: fromLogicalMinutes(start, b), durationMinutes: duration };
}

/** Wall-clock based interval for an occurrence (sleep 01:15–08:45 stays 08:45 across DST). */
export function occurrenceInterval(
  date: LocalDate,
  startTime: LocalTime,
  durationMinutes: number,
  ctx: TimeContext,
): { start: string; end: string } {
  const start = logicalDateTime(date, startTime, ctx);
  let end: DateTime = zonedDateTime(
    calendarDateFor(date, startTime, ctx),
    parseTime(startTime) + durationMinutes,
    ctx.zone,
  );
  if (end < start) end = start.plus({ minutes: durationMinutes });
  return { start: toISO(start), end: toISO(end) };
}

export interface ExpandInput {
  activities: ActivityTemplate[];
  states?: OccurrenceState[];
  dayModes?: Record<LocalDate, ScheduleMode>;
  defaultMode?: ScheduleMode;
  modeRules?: ModeRules;
  /** Inclusive range of logical dates to display. */
  from: LocalDate;
  to: LocalDate;
  ctx: TimeContext;
}

const PRIORITY_RANK = Object.fromEntries(PRIORITIES.map((p, i) => [p, i])) as Record<
  Priority,
  number
>;

export function expandAgenda(input: ExpandInput): Occurrence[] {
  const rules = input.modeRules ?? DEFAULT_MODE_RULES;
  const activities = input.activities.filter((a) => !a.archived);
  const byId = new Map(activities.map((a) => [a.id, a]));
  const stateByKey = new Map(
    (input.states ?? []).map((s) => [occurrenceKey(s.activityId, s.date), s]),
  );
  const modeFor = (date: LocalDate): ScheduleMode =>
    input.dayModes?.[date] ?? input.defaultMode ?? 'normal';
  const inRange = (date: LocalDate) => date >= input.from && date <= input.to;

  const out: Occurrence[] = [];

  for (const date of eachDate(input.from, input.to)) {
    const mode = modeFor(date);
    for (const activity of activities) {
      if (!occursOn(activity.recurrence, date)) continue;
      const state = stateByKey.get(occurrenceKey(activity.id, date));
      if (state?.override) {
        if (inRange(state.override.date)) {
          out.push(buildMoved(activity, state, modeFor(state.override.date), input.ctx));
        }
        continue;
      }
      out.push(buildNatural(activity, date, mode, rules, state, input.ctx));
    }
  }

  // Occurrences moved *into* the range from a date outside it.
  for (const state of input.states ?? []) {
    if (!state.override || inRange(state.date) || !inRange(state.override.date)) continue;
    const activity = byId.get(state.activityId);
    if (!activity || !occursOn(activity.recurrence, state.date)) continue;
    out.push(buildMoved(activity, state, modeFor(state.override.date), input.ctx));
  }

  return out.sort(compareOccurrences);
}

export function compareOccurrences(a: Occurrence, b: Occurrence): number {
  if (a.start !== b.start) return a.start < b.start ? -1 : 1;
  const p = PRIORITY_RANK[b.priority] - PRIORITY_RANK[a.priority];
  if (p !== 0) return p;
  return a.title.localeCompare(b.title);
}

function base(activity: ActivityTemplate, date: LocalDate, state: OccurrenceState | undefined) {
  return {
    key: occurrenceKey(activity.id, date),
    activityId: activity.id,
    date,
    title: activity.title,
    description: activity.description ?? null,
    category: activity.category,
    priority: activity.priority,
    essential: activity.essential,
    blocking: activity.blocking,
    trackId: activity.trackId ?? null,
    color: activity.color ?? null,
    status: state?.status ?? 'pending',
    completedAt: state?.completedAt ?? null,
    note: state?.note ?? null,
    actualMinutes: state?.actualMinutes ?? null,
  } as const;
}

function buildNatural(
  activity: ActivityTemplate,
  date: LocalDate,
  mode: ScheduleMode,
  rules: ModeRules,
  state: OccurrenceState | undefined,
  ctx: TimeContext,
): Occurrence {
  const timing = activityTiming(activity, date, ctx);
  const modeAction = resolveModeAction(activity, mode, rules);
  const duration =
    modeAction === 'shorten'
      ? shortenedDuration(timing.durationMinutes, rules[mode])
      : timing.durationMinutes;
  return {
    ...base(activity, date, state),
    displayDate: date,
    startTime: timing.startTime,
    durationMinutes: duration,
    plannedDurationMinutes: timing.durationMinutes,
    ...occurrenceInterval(date, timing.startTime, duration, ctx),
    mode,
    modeAction,
    rescheduled: false,
  };
}

function buildMoved(
  activity: ActivityTemplate,
  state: OccurrenceState,
  mode: ScheduleMode,
  ctx: TimeContext,
): Occurrence {
  const o = state.override!;
  return {
    ...base(activity, state.date, state),
    displayDate: o.date,
    startTime: o.startTime,
    durationMinutes: o.durationMinutes,
    plannedDurationMinutes: activity.durationMinutes,
    ...occurrenceInterval(o.date, o.startTime, o.durationMinutes, ctx),
    mode,
    // An explicit reschedule is a user decision; modes don't second-guess it.
    modeAction: 'keep',
    rescheduled: true,
  };
}
