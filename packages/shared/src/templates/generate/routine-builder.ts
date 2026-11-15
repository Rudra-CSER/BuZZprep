import { CATEGORY_META, type ReminderKind, type Weekday } from '../../constants';
import type { ActivityBundle, ReminderBundle } from '../../schemas/schedule';
import type { LocalDate } from '../../time';
import { recurrenceFor } from './context';

/** An activity to place: bundle fields with sensible defaults, plus the days it repeats on. */
export type ActivitySpec = Omit<
  ActivityBundle,
  'priority' | 'essential' | 'recurrence' | 'trackId'
> &
  Partial<Pick<ActivityBundle, 'priority' | 'essential'>> & { days: readonly Weekday[] };

/** Collects the activities and reminder rules of a generated routine, in order. */
export class RoutineBuilder {
  readonly activities: ActivityBundle[] = [];
  readonly reminders: ReminderBundle[] = [];

  constructor(
    private readonly startDate: LocalDate,
    private readonly kindEnabled: (kind: ReminderKind) => boolean,
  ) {}

  /** Add an activity; nothing is added when it has no days. */
  add(spec: ActivitySpec): ActivityBundle | null {
    if (spec.days.length === 0) return null;
    const { days, ...rest } = spec;
    const activity: ActivityBundle = {
      priority: 'medium',
      essential: false,
      blocking: CATEGORY_META[spec.category].defaultBlocking,
      description: null,
      trackRef: null,
      color: null,
      modeBehavior: null,
      progression: null,
      notes: null,
      ...rest,
      recurrence: recurrenceFor(days, this.startDate),
    };
    this.activities.push(activity);
    return activity;
  }

  has(ref: string): boolean {
    return this.activities.some((a) => a.ref === ref);
  }

  remind(
    kind: ReminderKind,
    anchor: ReminderBundle['anchor'],
    fields: Partial<ReminderBundle> = {},
  ) {
    this.reminders.push({
      kind,
      anchor,
      offsetMinutes: 0,
      enabled: this.kindEnabled(kind),
      bypassQuietHours: false,
      activityRef: null,
      time: null,
      recurrence: null,
      daysBefore: null,
      title: null,
      body: null,
      ...fields,
    });
  }

  /** Remind about an activity, if the routine has it. */
  onActivity(
    ref: string,
    kind: ReminderKind,
    anchor: 'activity_start' | 'activity_end',
    extra: Partial<ReminderBundle> = {},
  ) {
    if (this.has(ref)) this.remind(kind, anchor, { activityRef: ref, ...extra });
  }
}
