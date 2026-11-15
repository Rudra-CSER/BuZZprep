import { describe, expect, it } from 'vitest';
import {
  activityTiming,
  expandAgenda,
  needsReview,
  occurrenceTimeState,
  resolveModeAction,
  summarizeCompletion,
  type OccurrenceState,
} from '../src/schedule';
import { act, eveningRoutine, IST, NY } from './fixtures';

const FRI = '2026-11-13';
const at = (iso: string) => Date.parse(iso);

describe('expandAgenda', () => {
  it('expands a working day in chronological order, overnight blocks last', () => {
    const agenda = expandAgenda({ activities: eveningRoutine(), from: FRI, to: FRI, ctx: IST });
    expect(agenda.map((o) => o.title)).toEqual([
      'Morning planning',
      'Light revision',
      'Get ready',
      'Work',
      'Rest & food',
      'DSA deep work',
      'Dinner',
      'System Design session',
      'Personal time',
      'Wind down',
      'Sleep',
    ]);
    const sleep = agenda.find((o) => o.activityId === 'sleep')!;
    expect(sleep.start).toBe('2026-11-13T19:45:00.000Z'); // 01:15 IST on Sat
    expect(sleep.end).toBe('2026-11-14T03:15:00.000Z'); // 08:45 IST on Sat
    expect(sleep.displayDate).toBe(FRI);
  });

  it('skips weekday-only activities on weekends', () => {
    const agenda = expandAgenda({
      activities: eveningRoutine(),
      from: '2026-11-14',
      to: '2026-11-14',
      ctx: IST,
    });
    expect(agenda.map((o) => o.activityId)).toEqual(['plan', 'wind', 'sleep']);
  });

  it('applies modes without touching the template', () => {
    const activities = eveningRoutine();
    const busy = expandAgenda({
      activities,
      from: FRI,
      to: FRI,
      ctx: IST,
      dayModes: { [FRI]: 'busy' },
    });
    const main = busy.find((o) => o.activityId === 'main')!;
    expect(main.modeAction).toBe('shorten');
    expect(main.durationMinutes).toBe(35);
    expect(main.plannedDurationMinutes).toBe(70);
    expect(busy.find((o) => o.activityId === 'work')!.modeAction).toBe('keep');

    const recovery = expandAgenda({
      activities,
      from: FRI,
      to: FRI,
      ctx: IST,
      dayModes: { [FRI]: 'recovery' },
    });
    expect(recovery.find((o) => o.activityId === 'main')!.modeAction).toBe('skip');
    expect(recovery.find((o) => o.activityId === 'sleep')!.modeAction).toBe('keep');

    // The template itself is untouched; a normal day is unaffected.
    expect(activities.find((a) => a.id === 'main')!.durationMinutes).toBe(70);
    const normal = expandAgenda({ activities, from: FRI, to: FRI, ctx: IST });
    expect(normal.find((o) => o.activityId === 'main')!.durationMinutes).toBe(70);
  });

  it('lets per-activity mode behaviour override category defaults, but never essentials', () => {
    const a = act({
      title: 'Gym',
      category: 'gym',
      startTime: '21:45',
      durationMinutes: 60,
      modeBehavior: { busy: 'keep' },
    });
    expect(resolveModeAction(a, 'busy')).toBe('keep');
    expect(resolveModeAction({ ...a, modeBehavior: null }, 'busy')).toBe('optional');
    const essential = act({
      title: 'Work',
      category: 'job',
      startTime: '11:00',
      durationMinutes: 60,
      essential: true,
      modeBehavior: { recovery: 'skip' },
    });
    expect(resolveModeAction(essential, 'recovery')).toBe('keep');
  });

  it('moves rescheduled occurrences, including across the visible range', () => {
    const states: OccurrenceState[] = [
      {
        activityId: 'main',
        date: FRI,
        status: 'pending',
        override: { date: '2026-11-14', startTime: '11:00', durationMinutes: 70 },
      },
    ];
    const friday = expandAgenda({
      activities: eveningRoutine(),
      states,
      from: FRI,
      to: FRI,
      ctx: IST,
    });
    expect(friday.some((o) => o.activityId === 'main')).toBe(false);

    const saturday = expandAgenda({
      activities: eveningRoutine(),
      states,
      from: '2026-11-14',
      to: '2026-11-14',
      ctx: IST,
      dayModes: { '2026-11-14': 'recovery' },
    });
    const moved = saturday.find((o) => o.activityId === 'main')!;
    expect(moved).toMatchObject({
      date: FRI,
      displayDate: '2026-11-14',
      rescheduled: true,
      modeAction: 'keep',
      startTime: '11:00',
    });
    expect(moved.start).toBe('2026-11-14T05:30:00.000Z');
  });

  it('carries completion state onto occurrences', () => {
    const states: OccurrenceState[] = [
      { activityId: 'main', date: FRI, status: 'completed', actualMinutes: 80 },
    ];
    const agenda = expandAgenda({
      activities: eveningRoutine(),
      states,
      from: FRI,
      to: FRI,
      ctx: IST,
    });
    expect(agenda.find((o) => o.activityId === 'main')).toMatchObject({
      status: 'completed',
      actualMinutes: 80,
    });
  });

  it('ignores archived activities', () => {
    const activities = eveningRoutine().map((a) => (a.id === 'sd' ? { ...a, archived: true } : a));
    const agenda = expandAgenda({ activities, from: FRI, to: FRI, ctx: IST });
    expect(agenda.some((o) => o.activityId === 'sd')).toBe(false);
  });

  it('keeps wall-clock times across DST transitions', () => {
    const daily = { freq: 'daily', interval: 1, startDate: '2026-01-01', endDate: null } as const;
    const study = act({
      id: 'study',
      title: 'Study',
      category: 'dsa',
      startTime: '19:00',
      durationMinutes: 60,
      recurrence: daily,
    });
    const sleep = act({
      id: 'sleepny',
      title: 'Sleep',
      category: 'sleep',
      startTime: '23:30',
      durationMinutes: 450,
      recurrence: daily,
    });
    const agenda = expandAgenda({
      activities: [study, sleep],
      from: '2026-03-07',
      to: '2026-03-08',
      ctx: NY,
    });
    const sat = agenda.find((o) => o.activityId === 'study' && o.date === '2026-03-07')!;
    const sun = agenda.find((o) => o.activityId === 'study' && o.date === '2026-03-08')!;
    expect(sat.start).toBe('2026-03-08T00:00:00.000Z');
    expect(sun.start).toBe('2026-03-08T23:00:00.000Z');
    // Sleep 23:30 → 07:00 wall clock even though the night is an hour shorter.
    const night = agenda.find((o) => o.activityId === 'sleepny' && o.date === '2026-03-07')!;
    expect(night.end).toBe('2026-03-08T11:00:00.000Z'); // 07:00 EDT
  });
});

describe('gradual time progression', () => {
  const sleep = act({
    title: 'Sleep',
    category: 'sleep',
    startTime: '01:15',
    durationMinutes: 450,
    progression: {
      fromTime: '02:30',
      stepMinutes: 15,
      everyDays: 3,
      startDate: '2026-11-16',
      keepEnd: true,
    },
  });

  it('eases bedtime earlier in steps while keeping the wake-up time', () => {
    expect(activityTiming(sleep, '2026-11-10', IST)).toEqual({
      startTime: '02:30',
      durationMinutes: 375,
    });
    expect(activityTiming(sleep, '2026-11-16', IST)).toEqual({
      startTime: '02:30',
      durationMinutes: 375,
    });
    expect(activityTiming(sleep, '2026-11-19', IST)).toEqual({
      startTime: '02:15',
      durationMinutes: 390,
    });
    expect(activityTiming(sleep, '2026-12-01', IST)).toEqual({
      startTime: '01:15',
      durationMinutes: 450,
    });
    expect(activityTiming(sleep, '2027-01-01', IST)).toEqual({
      startTime: '01:15',
      durationMinutes: 450,
    });
  });

  it('shifts the whole block when keepEnd is false', () => {
    const wind = {
      ...sleep,
      startTime: '00:45',
      durationMinutes: 30,
      progression: { ...sleep.progression!, fromTime: '02:00', keepEnd: false },
    };
    expect(activityTiming(wind, '2026-11-19', IST)).toEqual({
      startTime: '01:45',
      durationMinutes: 30,
    });
  });
});

describe('missed sessions', () => {
  const agenda = expandAgenda({ activities: eveningRoutine(), from: FRI, to: FRI, ctx: IST });
  const main = agenda.find((o) => o.activityId === 'main')!; // 19:00–20:10 IST = 13:30–14:40Z

  it('never auto-completes: an unresolved session becomes "needs review" after the grace period', () => {
    expect(occurrenceTimeState(main, at('2026-11-13T13:00:00Z'))).toBe('upcoming');
    expect(occurrenceTimeState(main, at('2026-11-13T14:00:00Z'))).toBe('in_progress');
    expect(occurrenceTimeState(main, at('2026-11-13T14:50:00Z'))).toBe('in_progress'); // within grace
    expect(occurrenceTimeState(main, at('2026-11-13T15:11:00Z'))).toBe('needs_review');
    expect(needsReview(main, at('2026-11-13T15:11:00Z'))).toBe(true);
    expect(occurrenceTimeState({ ...main, status: 'completed' }, at('2026-11-13T15:11:00Z'))).toBe(
      'completed',
    );
  });

  it('does not nag about passive blocks or optional sessions', () => {
    const dinner = agenda.find((o) => o.activityId === 'dinner')!;
    expect(occurrenceTimeState(dinner, at('2026-11-13T20:00:00Z'))).toBe('passed');
    expect(
      occurrenceTimeState({ ...main, modeAction: 'optional' }, at('2026-11-13T20:00:00Z')),
    ).toBe('passed');
    expect(occurrenceTimeState({ ...main, modeAction: 'skip' }, at('2026-11-13T20:00:00Z'))).toBe(
      'paused',
    );
  });

  it('summarizes completion honestly (skips excluded, missed counted)', () => {
    const states: OccurrenceState[] = [
      { activityId: 'rev', date: FRI, status: 'skipped' },
      { activityId: 'plan', date: FRI, status: 'completed' },
    ];
    const day = expandAgenda({
      activities: eveningRoutine(),
      states,
      from: FRI,
      to: FRI,
      ctx: IST,
    });
    const summary = summarizeCompletion(day, at('2026-11-13T17:00:00Z')); // 22:30 IST
    // trackable: plan, rev, main, sd → rev skipped, plan done, main + sd need review
    expect(summary).toMatchObject({
      planned: 4,
      completed: 1,
      skipped: 1,
      needsReview: 2,
      remaining: 0,
      percent: 33,
    });
  });
});
