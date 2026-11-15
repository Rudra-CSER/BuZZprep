import type { TrackKind, Weekday } from '../../constants';
import type { HabitBundle } from '../../schemas/bundle';
import type { OnboardingAnswers } from '../../schemas/onboarding';
import type { NotificationPrefsInput } from '../../schemas/profile';
import { addDays, diffDays } from '../../time';
import type { PlanContext } from './context';

/** Template milestones placed between the start date and the deadline. */
export function buildMilestones({ answers, template, start }: PlanContext) {
  const totalDays = Math.max(1, diffDays(start, answers.deadline));
  return template.milestones.map((m) => ({
    title: m.title,
    dueDate: m.at >= 1 ? answers.deadline : addDays(start, Math.round(totalDays * m.at)),
    completed: false,
    note: null,
  }));
}

/** Template habits for the enabled tracks; the gym habit follows the gym days. */
export function buildHabits({ answers, template, tracks }: PlanContext, gymDays: Weekday[]) {
  const fitness = answers.fitness;
  const enabledKinds = new Set(tracks.map((t) => t.kind));
  const habits: HabitBundle[] = template.habits
    .filter((h) => {
      if (h.linkedCategory === 'gym') return fitness.enabled && fitness.sessionsPerWeek > 0;
      if (
        h.linkedCategory &&
        h.linkedCategory in { dsa: 1, system_design: 1, cs_fundamentals: 1 }
      ) {
        return enabledKinds.has(h.linkedCategory as TrackKind);
      }
      return true;
    })
    .map((h) =>
      h.linkedCategory === 'gym'
        ? { ...h, targetPerWeek: Math.max(1, fitness.sessionsPerWeek), days: gymDays }
        : h,
    );
  return habits;
}

export function buildNotificationPrefs(answers: OnboardingAnswers): NotificationPrefsInput {
  return {
    enabled: true,
    quietHours: answers.reminders.quietHours,
    kinds: answers.reminders.kinds,
    mutedCategories: [],
    defaultSnoozeMinutes: 10,
    hour12: true,
  };
}

/** Stretch companies become "dream" applications, the other targets "target" ones. */
export function buildCareer({ goal }: OnboardingAnswers) {
  return {
    applications: [
      ...goal.stretchCompanies.map((company) => ({
        company,
        role: goal.targetRole ?? null,
        stage: 'interested' as const,
        tier: 'dream' as const,
        jobUrl: null,
        notes: null,
      })),
      ...goal.targetCompanies
        .filter((c) => !goal.stretchCompanies.includes(c))
        .map((company) => ({
          company,
          role: goal.targetRole ?? null,
          stage: 'interested' as const,
          tier: 'target' as const,
          jobUrl: null,
          notes: null,
        })),
    ],
  };
}
