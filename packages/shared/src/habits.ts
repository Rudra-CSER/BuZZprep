import type { Weekday } from './constants';
import { addDays, diffDays, isoWeekday, startOfWeek, type LocalDate } from './time';

/**
 * Habit maths, designed to encourage consistency without punishing life:
 * - Primary metric is a consistency percentage over a window, not a streak.
 * - Streaks skip days the habit isn't expected (rest days) and tolerate a small number of
 *   "grace" misses per week, so one bad day doesn't erase weeks of effort.
 * - After a break, `comeback` reports it so the UI can offer a gentle ramp-up instead of blame.
 */

export interface HabitSchedule {
  /** Days the habit is expected. Empty = every day. */
  days: Weekday[];
  /** Grace misses allowed per ISO week before a streak breaks. */
  graceMissesPerWeek: number;
}

export function isExpected(schedule: HabitSchedule, date: LocalDate): boolean {
  return schedule.days.length === 0 || schedule.days.includes(isoWeekday(date));
}

export interface StreakResult {
  current: number;
  longest: number;
}

/**
 * Count completed expected days walking back from `today`. Today only counts if done
 * (an unfinished today never breaks the streak).
 */
export function habitStreak(
  completions: ReadonlySet<LocalDate>,
  schedule: HabitSchedule,
  today: LocalDate,
  lookbackDays = 400,
): StreakResult {
  let current = 0;
  let longest = 0;
  let run = 0;
  let currentFrozen = false;
  const missesByWeek = new Map<LocalDate, number>();

  for (let i = 0; i <= lookbackDays; i++) {
    const date = addDays(today, -i);
    if (!isExpected(schedule, date)) continue;
    if (completions.has(date)) {
      run++;
      if (!currentFrozen) current = run;
      longest = Math.max(longest, run);
      continue;
    }
    if (i === 0) continue; // today is still in progress
    const week = startOfWeek(date);
    const misses = (missesByWeek.get(week) ?? 0) + 1;
    missesByWeek.set(week, misses);
    if (misses <= schedule.graceMissesPerWeek) continue; // forgiven
    currentFrozen = true;
    run = 0;
  }
  return { current, longest };
}

export interface DayTally {
  date: LocalDate;
  planned: number;
  done: number;
}

export interface Consistency {
  /** Days with something planned. */
  plannedDays: number;
  /** Days on which at least one planned item was done. */
  activeDays: number;
  /** Sum(done) / Sum(planned), 0–100; null when nothing was planned. */
  percent: number | null;
}

export function consistency(days: DayTally[]): Consistency {
  const plannedDays = days.filter((d) => d.planned > 0);
  const planned = plannedDays.reduce((s, d) => s + d.planned, 0);
  const done = plannedDays.reduce((s, d) => s + Math.min(d.done, d.planned), 0);
  return {
    plannedDays: plannedDays.length,
    activeDays: plannedDays.filter((d) => d.done > 0).length,
    percent: planned > 0 ? Math.round((done / planned) * 100) : null,
  };
}

/** Habit completion rate over [from, to] for expected days (0–100, null if none expected). */
export function habitRate(
  completions: ReadonlySet<LocalDate>,
  schedule: HabitSchedule,
  from: LocalDate,
  to: LocalDate,
): number | null {
  let expected = 0;
  let done = 0;
  for (let i = 0; i <= diffDays(from, to); i++) {
    const date = addDays(from, i);
    if (!isExpected(schedule, date)) continue;
    expected++;
    if (completions.has(date)) done++;
  }
  return expected > 0 ? Math.round((done / expected) * 100) : null;
}

export interface Comeback {
  /** Whole days since the last active day (0 = active today). */
  daysAway: number;
  /** True when the gap is long enough to suggest a gentle restart. */
  suggestRamp: boolean;
}

export function comeback(lastActive: LocalDate | null, today: LocalDate, threshold = 3): Comeback {
  if (!lastActive) return { daysAway: 0, suggestRamp: false };
  const daysAway = Math.max(0, diffDays(lastActive, today));
  return { daysAway, suggestRamp: daysAway >= threshold };
}
