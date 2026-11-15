import { CATEGORY_META, DEFAULT_MISSED_GRACE_MINUTES } from '../constants';
import type { LocalDate } from '../time';
import type { Occurrence } from './types';

/** Where an occurrence stands right now, and completion summaries. */

/** Visible and not set aside (by the user or by the day's mode). */
export function isActive(o: Pick<Occurrence, 'modeAction' | 'status'>): boolean {
  return o.modeAction !== 'skip' && o.status !== 'skipped';
}

export function isTrackable(o: Pick<Occurrence, 'category'>): boolean {
  return CATEGORY_META[o.category].trackable;
}

export type OccurrenceTimeState =
  'paused' | 'skipped' | 'completed' | 'upcoming' | 'in_progress' | 'needs_review' | 'passed';

/**
 * How an occurrence looks *now*. A trackable, non-optional session that ended more than
 * `graceMinutes` ago without being resolved "needs review": it is never auto-completed.
 */
export function occurrenceTimeState(
  o: Pick<Occurrence, 'modeAction' | 'status' | 'start' | 'end' | 'category'>,
  now: number,
  graceMinutes = DEFAULT_MISSED_GRACE_MINUTES,
): OccurrenceTimeState {
  if (o.modeAction === 'skip') return 'paused';
  if (o.status === 'skipped') return 'skipped';
  if (o.status === 'completed') return 'completed';
  const start = Date.parse(o.start);
  const end = Date.parse(o.end);
  if (now < start) return 'upcoming';
  if (now < Math.max(end, start + 60_000)) return 'in_progress';
  if (!isTrackable(o) || o.modeAction === 'optional') return 'passed';
  return now >= end + graceMinutes * 60_000 ? 'needs_review' : 'in_progress';
}

export function needsReview(
  o: Pick<Occurrence, 'modeAction' | 'status' | 'start' | 'end' | 'category'>,
  now: number,
  graceMinutes = DEFAULT_MISSED_GRACE_MINUTES,
): boolean {
  return occurrenceTimeState(o, now, graceMinutes) === 'needs_review';
}

export interface DayCompletion {
  planned: number;
  completed: number;
  skipped: number;
  needsReview: number;
  remaining: number;
  /** completed / (planned − skipped); null when nothing is planned. */
  percent: number | null;
  plannedMinutes: number;
  completedMinutes: number;
}

/** Completion for trackable, non-optional, non-paused occurrences (e.g. one day's agenda). */
export function summarizeCompletion(
  occurrences: Occurrence[],
  now: number,
  graceMinutes = DEFAULT_MISSED_GRACE_MINUTES,
): DayCompletion {
  const relevant = occurrences.filter(
    (o) => isTrackable(o) && o.modeAction !== 'skip' && o.modeAction !== 'optional',
  );
  const completed = relevant.filter((o) => o.status === 'completed');
  const skipped = relevant.filter((o) => o.status === 'skipped').length;
  const review = relevant.filter((o) => needsReview(o, now, graceMinutes)).length;
  const denominator = relevant.length - skipped;
  return {
    planned: relevant.length,
    completed: completed.length,
    skipped,
    needsReview: review,
    remaining: relevant.length - completed.length - skipped - review,
    percent: denominator > 0 ? Math.round((completed.length / denominator) * 100) : null,
    plannedMinutes: relevant
      .filter((o) => o.status !== 'skipped')
      .reduce((sum, o) => sum + o.durationMinutes, 0),
    completedMinutes: completed.reduce((sum, o) => sum + (o.actualMinutes ?? o.durationMinutes), 0),
  };
}

/** Group occurrences by the logical date on which they are displayed. */
export function groupByDisplayDate(occurrences: Occurrence[]): Map<LocalDate, Occurrence[]> {
  const map = new Map<LocalDate, Occurrence[]>();
  for (const o of occurrences) {
    const list = map.get(o.displayDate) ?? [];
    list.push(o);
    map.set(o.displayDate, list);
  }
  return map;
}
