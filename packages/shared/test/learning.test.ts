import { describe, expect, it } from 'vitest';
import { consistency, habitRate, habitStreak, comeback } from '../src/habits';
import {
  bestOf,
  confidenceToOutcome,
  firstRevision,
  nextRevision,
  prepProgress,
  problemStats,
  revisionLabel,
} from '../src/learning';

describe('spaced revision', () => {
  const intervals = [1, 3, 7, 14, 30];

  it('walks the default 1/3/7/14/30 ladder on independent solves', () => {
    let s = firstRevision('2026-11-13', intervals);
    expect(s).toEqual({ stage: 0, dueDate: '2026-11-14' });
    s = nextRevision(s, 'independent', '2026-11-14', intervals);
    expect(s).toEqual({ stage: 1, dueDate: '2026-11-17' });
    s = nextRevision(s, 'independent', '2026-11-17', intervals);
    expect(s.dueDate).toBe('2026-11-24');
    s = nextRevision(s, 'independent', '2026-11-24', intervals);
    s = nextRevision(s, 'independent', '2026-12-08', intervals);
    expect(s).toEqual({ stage: 4, dueDate: '2027-01-07' });
    s = nextRevision(s, 'independent', '2027-01-07', intervals);
    expect(s).toEqual({ stage: 5, dueDate: null });
    expect(revisionLabel(s, intervals)).toBe('Mastered');
  });

  it('repeats on hints and resets when the editorial was needed', () => {
    const s = { stage: 2, dueDate: '2026-11-20' };
    expect(nextRevision(s, 'hints', '2026-11-20', intervals)).toEqual({
      stage: 2,
      dueDate: '2026-11-27',
    });
    expect(nextRevision(s, 'editorial', '2026-11-20', intervals)).toEqual({
      stage: 0,
      dueDate: '2026-11-21',
    });
    expect(nextRevision(s, 'unsolved', '2026-11-20', intervals)).toEqual({
      stage: 0,
      dueDate: '2026-11-21',
    });
  });

  it('supports custom intervals and confidence ratings', () => {
    expect(firstRevision('2026-11-13', [2, 5])).toEqual({ stage: 0, dueDate: '2026-11-15' });
    expect(confidenceToOutcome(5)).toBe('independent');
    expect(confidenceToOutcome(3)).toBe('hints');
    expect(confidenceToOutcome(1)).toBe('editorial');
  });
});

describe('problem statistics', () => {
  it('never counts assisted first attempts as independent', () => {
    const stats = problemStats([
      { firstOutcome: 'independent', bestOutcome: 'independent', difficulty: 'easy' },
      { firstOutcome: 'editorial', bestOutcome: 'independent', difficulty: 'easy' },
      { firstOutcome: 'hints', bestOutcome: 'hints', difficulty: 'medium' },
      { firstOutcome: 'unsolved', bestOutcome: 'unsolved', difficulty: 'hard' },
      { firstOutcome: null, bestOutcome: null, difficulty: 'medium' },
    ]);
    expect(stats).toMatchObject({
      total: 5,
      attempted: 4,
      independent: 1,
      hints: 1,
      editorial: 1,
      unsolved: 1,
      laterIndependent: 1,
    });
    expect(stats.byDifficulty.easy).toMatchObject({ total: 2, independent: 1, editorial: 1 });
  });

  it('keeps the best outcome', () => {
    expect(bestOf(null, 'editorial')).toBe('editorial');
    expect(bestOf('editorial', 'independent')).toBe('independent');
    expect(bestOf('independent', 'hints')).toBe('independent');
  });
});

describe('preparation progress', () => {
  it('reports day number and countdown', () => {
    expect(prepProgress('2026-11-16', '2027-05-15', '2026-11-13')).toMatchObject({
      dayNumber: 0,
      status: 'not_started',
    });
    const p = prepProgress('2026-11-16', '2027-05-15', '2026-11-20');
    expect(p).toMatchObject({
      dayNumber: 5,
      totalDays: 181,
      daysRemaining: 176,
      status: 'in_progress',
    });
    expect(prepProgress('2026-11-16', '2027-05-15', '2027-05-20').status).toBe('deadline_passed');
  });
});

describe('habits', () => {
  const set = (...dates: string[]) => new Set(dates);
  const everyDay = { days: [], graceMissesPerWeek: 0 };

  it('counts a streak without breaking on an unfinished today', () => {
    const s = habitStreak(set('2026-11-12', '2026-11-11', '2026-11-10'), everyDay, '2026-11-13');
    expect(s).toEqual({ current: 3, longest: 3 });
  });

  it('forgives grace misses and ignores rest days', () => {
    const weekdaysOnly = { days: [1, 2, 3, 4, 5] as (1 | 2 | 3 | 4 | 5)[], graceMissesPerWeek: 1 };
    // Fri 13 done, Thu 12 missed (grace), Wed 11 done, weekend ignored, Fri 6 done.
    const s = habitStreak(
      set('2026-11-13', '2026-11-11', '2026-11-10', '2026-11-09', '2026-11-06'),
      weekdaysOnly,
      '2026-11-13',
    );
    expect(s.current).toBe(5);
    const strict = habitStreak(
      set('2026-11-13', '2026-11-11'),
      { ...weekdaysOnly, graceMissesPerWeek: 0 },
      '2026-11-13',
    );
    expect(strict.current).toBe(1);
  });

  it('reports consistency and rates, and detects comebacks', () => {
    expect(
      consistency([
        { date: '2026-11-10', planned: 3, done: 3 },
        { date: '2026-11-11', planned: 3, done: 0 },
        { date: '2026-11-12', planned: 0, done: 0 },
      ]),
    ).toEqual({ plannedDays: 2, activeDays: 1, percent: 50 });
    expect(
      habitRate(
        set('2026-11-09', '2026-11-11'),
        { days: [1, 3, 5], graceMissesPerWeek: 0 },
        '2026-11-09',
        '2026-11-15',
      ),
    ).toBe(67);
    expect(comeback('2026-11-08', '2026-11-13')).toEqual({ daysAway: 5, suggestRamp: true });
  });
});
