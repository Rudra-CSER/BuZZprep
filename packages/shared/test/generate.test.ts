import { describe, expect, it } from 'vitest';
import { planNotifications, DEFAULT_NOTIFICATION_PREFERENCES } from '../src/reminders';
import { expandAgenda, type ActivityTemplate } from '../src/schedule';
import { configBundleSchema } from '../src/schemas/bundle';
import { onboardingAnswersSchema, TEMPLATE_KEYS } from '../src/schemas/onboarding';
import { defaultAnswers, generateBundle, summarizeWeek } from '../src/templates/generate';
import { formatTimeLabel, localTimeOf } from '../src/time';
import { IST, sdeAnswers } from './fixtures';

function toTemplates(bundle: ReturnType<typeof generateBundle>): ActivityTemplate[] {
  return bundle.schedule!.activities.map((a) => ({
    ...a,
    id: a.ref,
    blocking: a.blocking ?? true,
  }));
}

describe('generateBundle — working professional, evening study', () => {
  const bundle = generateBundle(sdeAnswers());

  it('produces a valid, self-consistent config bundle', () => {
    expect(() => configBundleSchema.parse(bundle)).not.toThrow();
    expect(bundle.tracks.map((t) => t.ref)).toEqual(['dsa', 'system_design', 'cs_fundamentals']);
    expect(bundle.plan!.milestones).toHaveLength(6);
    expect(bundle.plan!.milestones.at(-1)!.dueDate).toBe('2027-05-15');
    expect(bundle.career!.applications.map((a) => [a.company, a.tier])).toEqual([
      ['Company C', 'dream'],
      ['Company A', 'target'],
      ['Company B', 'target'],
    ]);
  });

  it('lays out a weekday that matches the requested routine', () => {
    // Monday after the sleep progression has finished.
    const agenda = expandAgenda({
      activities: toTemplates(bundle),
      from: '2026-12-07',
      to: '2026-12-07',
      ctx: IST,
    });
    const line = agenda.map((o) => `${o.startTime} ${o.title} (${o.durationMinutes})`);
    expect(line).toEqual([
      '09:00 Morning planning & journal (15)',
      '09:30 Light revision (45)',
      '10:15 Get ready & commute (45)',
      '11:00 Work (420)',
      '18:00 Commute, rest & food (60)',
      '19:00 DSA deep work (70)',
      '20:10 Break & dinner (30)',
      '20:40 System Design session (50)',
      '21:30 Personal time (195)',
      '21:45 Gym (60)',
      '00:45 Wind down & prepare for sleep (30)',
      '01:15 Sleep (450)',
    ]);
  });

  it('rotates the second session across secondary tracks', () => {
    const week = expandAgenda({
      activities: toTemplates(bundle),
      from: '2026-12-07',
      to: '2026-12-11',
      ctx: IST,
    });
    const second = week.filter((o) => o.startTime === '20:40').map((o) => o.title);
    expect(second).toEqual([
      'System Design session',
      'CS Fundamentals session',
      'System Design session',
      'CS Fundamentals session',
      'System Design session',
    ]);
  });

  it('eases the bedtime from the current habit toward the target', () => {
    const first = expandAgenda({
      activities: toTemplates(bundle),
      from: '2026-11-16',
      to: '2026-11-16',
      ctx: IST,
    });
    expect(first.find((o) => o.activityId === 'sleep')!.startTime).toBe('02:30');
    expect(first.find((o) => o.activityId === 'wind_down')!.startTime).toBe('02:00');
  });

  it('keeps bedtime reminders during the gradual shift, even inside quiet hours', () => {
    const occurrences = expandAgenda({
      activities: toTemplates(bundle),
      from: '2026-11-16',
      to: '2026-11-17',
      ctx: IST,
    });
    const reminders = bundle.reminders.map((r, i) => ({
      ...r,
      id: `r${i}`,
      activityId: r.activityRef ?? null,
    }));
    const planned = planNotifications({
      reminders,
      occurrences,
      prefs: {
        ...DEFAULT_NOTIFICATION_PREFERENCES,
        quietHours: { enabled: true, start: '01:30', end: '08:30' },
      },
      from: '2026-11-16T19:30:00.000Z', // Tue 01:00 IST, still Monday's logical day
      to: '2026-11-16T22:30:00.000Z', // Tue 04:00 IST
      ctx: IST,
    }).filter((p) => !p.suppressedReason);
    const times = planned.map(
      (p) => `${formatTimeLabel(localTimeOf(p.fireAt, IST.zone))} ${p.title}`,
    );
    expect(times).toEqual([
      '2:00 AM Prepare for sleep',
      '2:20 AM Tonight’s journal',
      '2:30 AM Target bedtime',
    ]);
  });

  it('creates the expected weekday notification timeline', () => {
    const occurrences = expandAgenda({
      activities: toTemplates(bundle),
      from: '2026-12-06',
      to: '2026-12-08',
      ctx: IST,
    });
    const reminders = bundle.reminders.map((r, i) => ({
      ...r,
      id: `r${i}`,
      activityId: r.activityRef ?? null,
    }));
    const planned = planNotifications({
      reminders,
      occurrences,
      prefs: {
        ...DEFAULT_NOTIFICATION_PREFERENCES,
        quietHours: { enabled: true, start: '01:30', end: '08:30' },
      },
      from: '2026-12-06T22:30:00.000Z', // Mon 04:00 IST
      to: '2026-12-07T22:30:00.000Z',
      ctx: IST,
    }).filter((p) => !p.suppressedReason);
    const times = planned.map(
      (p) => `${formatTimeLabel(localTimeOf(p.fireAt, IST.zone))} ${p.kind}`,
    );
    expect(times).toEqual([
      '8:45 AM sleep',
      '9:00 AM daily_planning',
      '9:30 AM start',
      '10:15 AM start',
      '11:00 AM start',
      '6:00 PM start',
      '6:50 PM upcoming',
      '7:00 PM start',
      '8:10 PM start',
      '8:30 PM overdue',
      '8:30 PM upcoming',
      '8:40 PM start',
      '9:30 PM start',
      '9:30 PM upcoming',
      '9:35 PM missed_digest',
      '9:50 PM overdue',
      '12:45 AM sleep',
      '1:05 AM journal',
      '1:15 AM sleep',
    ]);
  });

  it('summarizes the week for the onboarding preview', () => {
    const summary = summarizeWeek(bundle);
    // 5 × (45 + 70 + 50) + 120 on Saturday
    expect(summary.studyMinutes).toBe(945);
    expect(summary.gymSessions).toBe(3);
  });
});

describe('generateBundle — every template with default answers', () => {
  for (const key of TEMPLATE_KEYS) {
    it(`builds a valid bundle for "${key}"`, () => {
      const answers = onboardingAnswersSchema.parse(
        defaultAnswers(key, { timezone: 'Europe/Berlin', today: '2026-11-13' }),
      );
      const bundle = generateBundle(answers);
      expect(() => configBundleSchema.parse(bundle)).not.toThrow();
      const agenda = expandAgenda({
        activities: toTemplates(bundle),
        from: '2026-11-16',
        to: '2026-11-22',
        ctx: { zone: 'Europe/Berlin', dayBoundaryMinutes: 240 },
      });
      expect(agenda.length).toBeGreaterThan(10);
    });
  }

  it('supports people without fixed working hours', () => {
    const answers = sdeAnswers({
      work: {
        enabled: false,
        label: 'Work',
        days: [],
        start: '09:00',
        end: '17:00',
        commuteMinutes: 0,
        pressure: null,
      },
      study: {
        weekdayMinutes: 240,
        weekendMinutes: 0,
        preferredWindow: 'morning',
        morningRevisionMinutes: 0,
      },
    });
    const bundle = generateBundle(answers);
    expect(bundle.schedule!.activities.some((a) => a.category === 'job')).toBe(false);
    const main = bundle.schedule!.activities.find((a) => a.ref === 'session_main')!;
    expect(main.startTime).toBe('10:00');
    expect(summarizeWeek(bundle).studyMinutes).toBe(1200);
  });
});
