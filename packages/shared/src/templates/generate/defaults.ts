import type { OnboardingAnswersInput, TemplateKey } from '../../schemas/onboarding';
import { addDays, type LocalDate } from '../../time';
import { getTemplate } from '../catalog';

/** Sensible starting answers for the onboarding wizard. */
export function defaultAnswers(
  templateKey: TemplateKey,
  opts: { timezone: string; today: LocalDate },
): OnboardingAnswersInput {
  const tpl = getTemplate(templateKey);
  const deadline = addDays(opts.today, Math.round(tpl.durationMonths * 30.4));
  return {
    templateKey,
    timezone: opts.timezone,
    goal: {
      title: tpl.defaultGoalTitle,
      targetRole: tpl.defaultRole,
      targetCompanies: [],
      stretchCompanies: [],
      compensationTarget: null,
      description: null,
    },
    startDate: opts.today,
    deadline,
    work: {
      enabled: true,
      label: 'Work',
      days: [1, 2, 3, 4, 5],
      start: '09:30',
      end: '18:00',
      commuteMinutes: 30,
      pressure: 'moderate',
    },
    sleep: {
      currentBedtime: '00:30',
      currentWake: '08:00',
      targetBedtime: '23:30',
      targetWake: '07:00',
      gradualShift: true,
    },
    study: {
      weekdayMinutes: tpl.defaults.weekdayMinutes,
      weekendMinutes: tpl.defaults.weekendMinutes,
      preferredWindow: 'evening',
      morningRevisionMinutes: tpl.defaults.morningRevisionMinutes,
    },
    skills: { levels: Object.fromEntries(tpl.tracks.map((t) => [t.ref, 'beginner'])), notes: null },
    tracks: tpl.tracks.map((t) => ({ ref: t.ref, title: t.title, kind: t.kind, enabled: true })),
    reminders: {
      kinds: {},
      leadMinutes: 10,
      quietHours: { enabled: true, start: '23:45', end: '06:45' },
    },
    restDays: [7],
    fitness: { enabled: true, sessionsPerWeek: 3, days: [], durationMinutes: 60, time: null },
  };
}
