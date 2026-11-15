import { DEFAULT_REVISION_INTERVALS, type ProblemOutcome } from '../constants';
import { addDays, type LocalDate } from '../time';

/**
 * Spaced revision (Leitner-style).
 * stage = number of revision steps already passed; the next revision is due
 * `intervals[stage]` days after the last attempt.
 *  - solved independently  → advance one stage (mastered after the last interval)
 *  - solved with hints     → repeat the same interval
 *  - editorial / unsolved  → back to the first interval
 * A copied or editorial-assisted solve never advances the schedule.
 */
export interface RevisionState {
  stage: number;
  /** null when mastered (all intervals passed). */
  dueDate: LocalDate | null;
}

export function normalizeIntervals(intervals?: readonly number[] | null): number[] {
  const list = (intervals ?? DEFAULT_REVISION_INTERVALS)
    .map((n) => Math.round(n))
    .filter((n) => n > 0);
  return list.length > 0 ? list : [...DEFAULT_REVISION_INTERVALS];
}

export function firstRevision(from: LocalDate, intervals?: readonly number[]): RevisionState {
  const list = normalizeIntervals(intervals);
  return { stage: 0, dueDate: addDays(from, list[0]!) };
}

export function nextRevision(
  current: RevisionState,
  outcome: ProblemOutcome,
  from: LocalDate,
  intervals?: readonly number[],
): RevisionState {
  const list = normalizeIntervals(intervals);
  switch (outcome) {
    case 'independent': {
      const stage = current.stage + 1;
      if (stage >= list.length) return { stage: list.length, dueDate: null };
      return { stage, dueDate: addDays(from, list[stage]!) };
    }
    case 'hints': {
      const stage = Math.min(current.stage, list.length - 1);
      return { stage, dueDate: addDays(from, list[stage]!) };
    }
    case 'editorial':
    case 'unsolved':
      return { stage: 0, dueDate: addDays(from, list[0]!) };
  }
}

/** Map a 1–5 self-rated confidence (e.g. System Design topics) onto a revision outcome. */
export function confidenceToOutcome(confidence: number): ProblemOutcome {
  if (confidence >= 4) return 'independent';
  if (confidence === 3) return 'hints';
  return 'editorial';
}

export function isRevisionDue(state: RevisionState | null | undefined, today: LocalDate): boolean {
  return !!state?.dueDate && state.dueDate <= today;
}

export function revisionLabel(state: RevisionState, intervals?: readonly number[]): string {
  const list = normalizeIntervals(intervals);
  if (state.dueDate === null) return 'Mastered';
  return `Revision ${Math.min(state.stage + 1, list.length)} of ${list.length}`;
}
