import type { ActivityTemplate } from '../src/schedule';
import type { OnboardingAnswers } from '../src/schemas/onboarding';
import { onboardingAnswersSchema } from '../src/schemas/onboarding';
import type { TimeContext } from '../src/time';

export const IST: TimeContext = { zone: 'Asia/Kolkata', dayBoundaryMinutes: 240 };
export const NY: TimeContext = { zone: 'America/New_York', dayBoundaryMinutes: 240 };

let seq = 0;
export function act(
  partial: Partial<ActivityTemplate> &
    Pick<ActivityTemplate, 'title' | 'startTime' | 'durationMinutes' | 'category'>,
): ActivityTemplate {
  seq++;
  return {
    id: partial.id ?? `a${seq}`,
    priority: 'medium',
    essential: false,
    blocking: true,
    recurrence: { freq: 'daily', interval: 1, startDate: '2026-11-01', endDate: null },
    ...partial,
  };
}

const weekdays = {
  freq: 'weekly',
  interval: 1,
  byWeekday: [1, 2, 3, 4, 5],
  startDate: '2026-11-01',
  endDate: null,
} as const;

/** A working-professional evening-study routine (generic test data, no personal info). */
export function eveningRoutine(): ActivityTemplate[] {
  return [
    act({
      id: 'sleep',
      title: 'Sleep',
      category: 'sleep',
      startTime: '01:15',
      durationMinutes: 450,
      essential: true,
      priority: 'critical',
    }),
    act({
      id: 'wind',
      title: 'Wind down',
      category: 'sleep',
      startTime: '00:45',
      durationMinutes: 30,
    }),
    act({
      id: 'plan',
      title: 'Morning planning',
      category: 'journaling',
      startTime: '09:00',
      durationMinutes: 15,
    }),
    act({
      id: 'rev',
      title: 'Light revision',
      category: 'dsa',
      startTime: '09:30',
      durationMinutes: 45,
      recurrence: { ...weekdays, byWeekday: [...weekdays.byWeekday] },
      priority: 'low',
    }),
    act({
      id: 'ready',
      title: 'Get ready',
      category: 'personal',
      startTime: '10:15',
      durationMinutes: 45,
      recurrence: { ...weekdays, byWeekday: [...weekdays.byWeekday] },
    }),
    act({
      id: 'work',
      title: 'Work',
      category: 'job',
      startTime: '11:00',
      durationMinutes: 420,
      essential: true,
      priority: 'critical',
      recurrence: { ...weekdays, byWeekday: [...weekdays.byWeekday] },
    }),
    act({
      id: 'rest',
      title: 'Rest & food',
      category: 'rest',
      startTime: '18:00',
      durationMinutes: 60,
      recurrence: { ...weekdays, byWeekday: [...weekdays.byWeekday] },
    }),
    act({
      id: 'main',
      title: 'DSA deep work',
      category: 'dsa',
      startTime: '19:00',
      durationMinutes: 70,
      priority: 'high',
      recurrence: { ...weekdays, byWeekday: [...weekdays.byWeekday] },
    }),
    act({
      id: 'dinner',
      title: 'Dinner',
      category: 'food',
      startTime: '20:10',
      durationMinutes: 30,
      recurrence: { ...weekdays, byWeekday: [...weekdays.byWeekday] },
    }),
    act({
      id: 'sd',
      title: 'System Design session',
      category: 'system_design',
      startTime: '20:40',
      durationMinutes: 50,
      priority: 'high',
      recurrence: { ...weekdays, byWeekday: [...weekdays.byWeekday] },
    }),
    act({
      id: 'personal',
      title: 'Personal time',
      category: 'personal',
      startTime: '21:30',
      durationMinutes: 195,
      blocking: false,
      priority: 'low',
      recurrence: { ...weekdays, byWeekday: [...weekdays.byWeekday] },
    }),
  ];
}

/** Onboarding answers for an SDE-1 working professional (generic test data). */
export function sdeAnswers(overrides: Partial<OnboardingAnswers> = {}): OnboardingAnswers {
  return onboardingAnswersSchema.parse({
    templateKey: 'sde_interview',
    timezone: 'Asia/Kolkata',
    goal: {
      title: 'Become interview-ready for SDE-1 roles',
      targetRole: 'SDE-1',
      targetCompanies: ['Company A', 'Company B'],
      stretchCompanies: ['Company C'],
    },
    startDate: '2026-11-16',
    deadline: '2027-05-15',
    work: {
      enabled: true,
      label: 'Work',
      days: [1, 2, 3, 4, 5],
      start: '11:00',
      end: '18:00',
      commuteMinutes: 30,
      pressure: 'moderate',
    },
    sleep: {
      currentBedtime: '02:30',
      currentWake: '09:30',
      targetBedtime: '01:15',
      targetWake: '08:45',
      gradualShift: true,
    },
    study: {
      weekdayMinutes: 120,
      weekendMinutes: 120,
      preferredWindow: 'evening',
      morningRevisionMinutes: 45,
    },
    skills: { levels: { dsa: 'beginner', system_design: 'beginner' }, notes: null },
    tracks: [
      { ref: 'dsa', title: 'DSA', kind: 'dsa', enabled: true },
      { ref: 'system_design', title: 'System Design', kind: 'system_design', enabled: true },
      { ref: 'cs_fundamentals', title: 'CS Fundamentals', kind: 'cs_fundamentals', enabled: true },
    ],
    reminders: {
      kinds: {},
      leadMinutes: 10,
      quietHours: { enabled: true, start: '01:30', end: '08:30' },
    },
    restDays: [7],
    fitness: { enabled: true, sessionsPerWeek: 3, days: [], durationMinutes: 60, time: null },
    ...overrides,
  });
}
