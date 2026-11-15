import type { ActivityCategory, ReminderAnchor, ReminderKind } from '../constants';
import type { Occurrence } from '../schedule';
import type { LocalDate, LocalTime, Recurrence, TimeContext } from '../time';

/** Reminder rules, user preferences and planned notifications. */

export interface ReminderRule {
  id: string;
  kind: ReminderKind;
  anchor: ReminderAnchor;
  activityId?: string | null;
  /** Minutes relative to the anchor (negative = before). Activity anchors only. */
  offsetMinutes: number;
  /** Local time for 'time' and 'milestone' anchors. */
  time?: LocalTime | null;
  /** Which logical days a 'time' reminder fires on. */
  recurrence?: Recurrence | null;
  /** Milestone anchor: days before the due date (0 = on the day). */
  daysBefore?: number[] | null;
  title?: string | null;
  body?: string | null;
  enabled: boolean;
  bypassQuietHours: boolean;
}

export interface QuietHours {
  enabled: boolean;
  start: LocalTime;
  end: LocalTime;
}

export interface NotificationPreferences {
  enabled: boolean;
  quietHours: QuietHours;
  /** Per notification type on/off. Missing = on. */
  kinds: Partial<Record<ReminderKind, boolean>>;
  /** Activity categories whose reminders are muted. */
  mutedCategories: ActivityCategory[];
  defaultSnoozeMinutes: number;
  hour12: boolean;
}

export interface MilestoneRef {
  id: string;
  title: string;
  dueDate: LocalDate;
  completed: boolean;
}

export type NotificationCondition = 'occurrence_pending' | 'missed_exists' | null;
export type SuppressedReason =
  'quiet_hours' | 'kind_disabled' | 'category_muted' | 'notifications_disabled' | null;

export interface PlannedNotification {
  /** Stable identity; includes the fire time so moved occurrences get fresh reminders. */
  dedupeKey: string;
  reminderId: string;
  kind: ReminderKind;
  fireAt: string;
  activityId: string | null;
  occurrenceDate: LocalDate | null;
  title: string;
  body: string;
  /** App-relative deep link. */
  url: string;
  tag: string;
  condition: NotificationCondition;
  urgency: 'high' | 'normal' | 'low';
  /** Push service TTL — a "starts now" reminder is useless hours later. */
  ttlSeconds: number;
  /** If the dispatcher is this late (e.g. after downtime) the notification expires instead. */
  maxLatenessSeconds: number;
  suppressedReason: SuppressedReason;
}

export interface NotificationPlanInput {
  reminders: ReminderRule[];
  /** Expanded agenda covering the window (plus margin for negative/positive offsets). */
  occurrences: Occurrence[];
  milestones?: MilestoneRef[];
  prefs: NotificationPreferences;
  /** Half-open window [from, to) as ISO instants. */
  from: string;
  to: string;
  ctx: TimeContext;
}
