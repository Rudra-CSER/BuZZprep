import { describe, expect, it } from 'vitest';
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  isWithinDailyRange,
  planNotifications,
  type NotificationPreferences,
  type ReminderRule,
} from '../src/reminders';
import { expandAgenda, type OccurrenceState } from '../src/schedule';
import { eveningRoutine, IST } from './fixtures';

const FRI = '2026-11-13';
const prefs: NotificationPreferences = {
  ...DEFAULT_NOTIFICATION_PREFERENCES,
  quietHours: { enabled: true, start: '01:30', end: '08:30' },
};

function rule(
  partial: Partial<ReminderRule> & Pick<ReminderRule, 'id' | 'kind' | 'anchor'>,
): ReminderRule {
  return { offsetMinutes: 0, enabled: true, bypassQuietHours: false, ...partial };
}

function plan(
  reminders: ReminderRule[],
  opts: {
    states?: OccurrenceState[];
    mode?: 'busy' | 'recovery';
    prefs?: NotificationPreferences;
  } = {},
) {
  const occurrences = expandAgenda({
    activities: eveningRoutine(),
    states: opts.states,
    dayModes: opts.mode ? { [FRI]: opts.mode } : undefined,
    from: '2026-11-12',
    to: '2026-11-14',
    ctx: IST,
  });
  return planNotifications({
    reminders,
    occurrences,
    prefs: opts.prefs ?? prefs,
    from: '2026-11-12T22:30:00.000Z', // Fri 04:00 IST
    to: '2026-11-13T22:30:00.000Z', // Sat 04:00 IST
    ctx: IST,
  });
}

const sessionRules = [
  rule({
    id: 'up',
    kind: 'upcoming',
    anchor: 'activity_start',
    activityId: 'main',
    offsetMinutes: -10,
  }),
  rule({ id: 'st', kind: 'start', anchor: 'activity_start', activityId: 'main' }),
  rule({
    id: 'od',
    kind: 'overdue',
    anchor: 'activity_end',
    activityId: 'main',
    offsetMinutes: 20,
  }),
];

describe('planNotifications — activity reminders', () => {
  it('computes fire times from the occurrence in the user timezone', () => {
    const planned = plan(sessionRules);
    expect(planned.map((p) => [p.kind, p.fireAt])).toEqual([
      ['upcoming', '2026-11-13T13:20:00.000Z'], // 18:50 IST
      ['start', '2026-11-13T13:30:00.000Z'], // 19:00 IST
      ['overdue', '2026-11-13T15:00:00.000Z'], // 20:30 IST
    ]);
    const upcoming = planned[0]!;
    expect(upcoming.title).toBe('DSA deep work in 10 min');
    expect(upcoming.body).toBe('7:00 PM – 8:10 PM · DSA');
    expect(upcoming.url).toBe('/schedule/occurrence/main/2026-11-13');
    expect(upcoming.condition).toBe('occurrence_pending');
    expect(upcoming.maxLatenessSeconds).toBe(600);
  });

  it('drops reminders for completed or skipped occurrences', () => {
    expect(
      plan(sessionRules, { states: [{ activityId: 'main', date: FRI, status: 'completed' }] }),
    ).toEqual([]);
    expect(
      plan(sessionRules, { states: [{ activityId: 'main', date: FRI, status: 'skipped' }] }),
    ).toEqual([]);
  });

  it('follows the day mode: shortened text in Busy, silence in Recovery', () => {
    const busy = plan(sessionRules, { mode: 'busy' });
    expect(busy.find((p) => p.kind === 'start')!.body).toContain('shortened for Busy workday');
    expect(busy.find((p) => p.kind === 'overdue')!.fireAt).toBe('2026-11-13T14:25:00.000Z'); // 35-min block
    expect(plan(sessionRules, { mode: 'recovery' })).toEqual([]);
  });

  it('follows rescheduled occurrences and changes the dedupe key', () => {
    const before = plan(sessionRules).find((p) => p.kind === 'start')!;
    const after = plan(sessionRules, {
      states: [
        {
          activityId: 'main',
          date: FRI,
          status: 'pending',
          override: { date: FRI, startTime: '21:45', durationMinutes: 70 },
        },
      ],
    }).find((p) => p.kind === 'start')!;
    expect(after.fireAt).toBe('2026-11-13T16:15:00.000Z');
    expect(after.dedupeKey).not.toBe(before.dedupeKey);
  });

  it('applies quiet hours unless the reminder bypasses them', () => {
    const wake = rule({ id: 'wake', kind: 'sleep', anchor: 'activity_end', activityId: 'sleep' });
    const bed = rule({
      id: 'bed',
      kind: 'sleep',
      anchor: 'activity_start',
      activityId: 'sleep',
      offsetMinutes: 30,
    });
    const planned = plan([wake, bed]);
    const wakeUp = planned.find((p) => p.reminderId === 'wake')!;
    expect(wakeUp.title).toBe('Good morning — time to get up');
    expect(wakeUp.suppressedReason).toBeNull(); // 08:45 is outside 01:30–08:30
    expect(planned.find((p) => p.reminderId === 'bed')!.suppressedReason).toBe('quiet_hours'); // 01:45
    const bypass = plan([{ ...bed, bypassQuietHours: true }]);
    expect(bypass[0]!.suppressedReason).toBeNull();
  });

  it('respects per-type and per-category preferences', () => {
    const p1 = plan(sessionRules, { prefs: { ...prefs, kinds: { overdue: false } } });
    expect(p1.find((p) => p.kind === 'overdue')!.suppressedReason).toBe('kind_disabled');
    const p2 = plan(sessionRules, { prefs: { ...prefs, mutedCategories: ['dsa'] } });
    expect(p2.every((p) => p.suppressedReason === 'category_muted')).toBe(true);
    expect(plan([{ ...sessionRules[0]!, enabled: false }])).toEqual([]);
  });
});

describe('planNotifications — time and milestone reminders', () => {
  it('fires daily time reminders once per logical day in the window', () => {
    const digest = rule({
      id: 'dg',
      kind: 'missed_digest',
      anchor: 'time',
      time: '21:35',
      recurrence: { freq: 'daily', interval: 1, startDate: '2026-11-01' },
    });
    const planned = plan([digest]);
    expect(planned).toHaveLength(1);
    expect(planned[0]).toMatchObject({
      fireAt: '2026-11-13T16:05:00.000Z',
      condition: 'missed_exists',
      url: '/schedule/review',
    });
  });

  it('plans milestone reminders N days before the due date', () => {
    const occurrences = expandAgenda({ activities: [], from: FRI, to: FRI, ctx: IST });
    const planned = planNotifications({
      reminders: [
        rule({
          id: 'ms',
          kind: 'milestone',
          anchor: 'milestone',
          time: '09:00',
          daysBefore: [7, 1, 0],
        }),
      ],
      occurrences,
      milestones: [
        { id: 'm1', title: 'Trees done', dueDate: '2026-11-20', completed: false },
        { id: 'm2', title: 'Old', dueDate: '2026-11-14', completed: true },
      ],
      prefs,
      from: '2026-11-12T22:30:00.000Z',
      to: '2026-11-13T22:30:00.000Z',
      ctx: IST,
    });
    expect(planned).toHaveLength(1);
    expect(planned[0]!.title).toBe('Milestone in 7 days: Trees done');
    expect(planned[0]!.fireAt).toBe('2026-11-13T03:30:00.000Z');
  });
});

describe('isWithinDailyRange', () => {
  it('handles ranges that wrap midnight', () => {
    expect(isWithinDailyRange('02:00', '01:30', '08:30')).toBe(true);
    expect(isWithinDailyRange('08:30', '01:30', '08:30')).toBe(false);
    expect(isWithinDailyRange('23:59', '22:00', '06:00')).toBe(true);
    expect(isWithinDailyRange('12:00', '22:00', '06:00')).toBe(false);
  });
});
