import type { Difficulty, ProblemOutcome } from '../constants';
import { diffDays, type LocalDate } from '../time';

export interface PrepProgress {
  /** 1-based day number of the preparation (0 before it starts). */
  dayNumber: number;
  totalDays: number;
  /** Days left until the deadline (negative once passed). */
  daysRemaining: number;
  /** 0–100. */
  percent: number;
  status: 'not_started' | 'in_progress' | 'deadline_passed';
}

export function prepProgress(
  startDate: LocalDate,
  deadline: LocalDate,
  today: LocalDate,
): PrepProgress {
  const totalDays = Math.max(1, diffDays(startDate, deadline) + 1);
  const elapsed = diffDays(startDate, today);
  const daysRemaining = diffDays(today, deadline);
  const dayNumber = elapsed < 0 ? 0 : Math.min(elapsed + 1, totalDays);
  const percent = Math.min(100, Math.max(0, Math.round((dayNumber / totalDays) * 100)));
  return {
    dayNumber,
    totalDays,
    daysRemaining,
    percent,
    status: elapsed < 0 ? 'not_started' : daysRemaining < 0 ? 'deadline_passed' : 'in_progress',
  };
}

export function greetingFor(hour: number): string {
  if (hour >= 5 && hour < 12) return 'Good morning';
  if (hour >= 12 && hour < 17) return 'Good afternoon';
  if (hour >= 17 && hour < 22) return 'Good evening';
  return 'Burning the midnight oil';
}

export interface ProblemLike {
  firstOutcome: ProblemOutcome | null;
  bestOutcome: ProblemOutcome | null;
  difficulty: Difficulty;
}

export interface OutcomeCounts {
  total: number;
  attempted: number;
  independent: number;
  hints: number;
  editorial: number;
  unsolved: number;
}

const emptyCounts = (): OutcomeCounts => ({
  total: 0,
  attempted: 0,
  independent: 0,
  hints: 0,
  editorial: 0,
  unsolved: 0,
});

export interface ProblemStats extends OutcomeCounts {
  /** Problems first seen with help that were later re-solved independently on revision. */
  laterIndependent: number;
  byDifficulty: Record<Difficulty, OutcomeCounts>;
}

/**
 * Classification uses the *first* attempt: interviews test unseen problems, so a problem only
 * counts as "solved independently" if it was solved without help the first time. Later
 * independent re-solves are reported separately (`laterIndependent`).
 */
export function problemStats(problems: ProblemLike[]): ProblemStats {
  const stats: ProblemStats = {
    ...emptyCounts(),
    laterIndependent: 0,
    byDifficulty: { easy: emptyCounts(), medium: emptyCounts(), hard: emptyCounts() },
  };
  for (const p of problems) {
    const buckets = [stats, stats.byDifficulty[p.difficulty]];
    for (const b of buckets) {
      b.total++;
      if (p.firstOutcome) {
        b.attempted++;
        b[p.firstOutcome]++;
      }
    }
    if (p.firstOutcome && p.firstOutcome !== 'independent' && p.bestOutcome === 'independent') {
      stats.laterIndependent++;
    }
  }
  return stats;
}

const OUTCOME_RANK: Record<ProblemOutcome, number> = {
  independent: 3,
  hints: 2,
  editorial: 1,
  unsolved: 0,
};

export function bestOf(a: ProblemOutcome | null, b: ProblemOutcome): ProblemOutcome {
  if (!a) return b;
  return OUTCOME_RANK[b] > OUTCOME_RANK[a] ? b : a;
}
