import type { ActivityCategory, ModeAction, Priority, ScheduleMode } from '../constants';
import type { LocalDate, LocalTime, Recurrence } from '../time';

/** Shapes the schedule engine works with: activity templates and their occurrences. */

/** Gradually move an activity's start time toward its target (e.g. an earlier bedtime). */
export interface TimeProgression {
  /** Where the user is today, e.g. "02:30". */
  fromTime: LocalTime;
  /** How far to move per step, in minutes. */
  stepMinutes: number;
  /** Days between steps. */
  everyDays: number;
  /** Logical date of the first day of the progression. */
  startDate: LocalDate;
  /** Keep the end time fixed (sleep: shift bedtime, keep wake-up) instead of shifting the block. */
  keepEnd: boolean;
}

export interface ActivityTemplate {
  id: string;
  title: string;
  description?: string | null;
  category: ActivityCategory;
  /** Local wall-clock start. Times before the day boundary belong to the previous logical day. */
  startTime: LocalTime;
  /** 0 = a point in time (e.g. "Wake up"). */
  durationMinutes: number;
  recurrence: Recurrence;
  priority: Priority;
  /** Essential activities are never shortened, skipped or displaced by modes or rescheduling. */
  essential: boolean;
  /** Blocking activities make their time unavailable to the slot finder. */
  blocking: boolean;
  trackId?: string | null;
  color?: string | null;
  /** Per-mode overrides of the default mode rules. */
  modeBehavior?: Partial<Record<ScheduleMode, ModeAction>> | null;
  progression?: TimeProgression | null;
  archived?: boolean;
}

export type OccurrenceStatus = 'pending' | 'completed' | 'skipped';

export interface OccurrenceOverride {
  date: LocalDate;
  startTime: LocalTime;
  durationMinutes: number;
}

/** Persisted state of one occurrence (an "exception" to the series). */
export interface OccurrenceState {
  activityId: string;
  /** Original logical date — the occurrence's identity. */
  date: LocalDate;
  status: OccurrenceStatus;
  override?: OccurrenceOverride | null;
  completedAt?: string | null;
  note?: string | null;
  actualMinutes?: number | null;
}

export interface Occurrence {
  key: string;
  activityId: string;
  /** Original logical date (identity). */
  date: LocalDate;
  /** Logical date on which it currently appears (differs when rescheduled to another day). */
  displayDate: LocalDate;
  title: string;
  description: string | null;
  category: ActivityCategory;
  priority: Priority;
  essential: boolean;
  blocking: boolean;
  trackId: string | null;
  color: string | null;
  startTime: LocalTime;
  durationMinutes: number;
  plannedDurationMinutes: number;
  /** ISO instants (UTC). */
  start: string;
  end: string;
  mode: ScheduleMode;
  modeAction: ModeAction;
  status: OccurrenceStatus;
  rescheduled: boolean;
  completedAt: string | null;
  note: string | null;
  actualMinutes: number | null;
}
