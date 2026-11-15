import { CONFIG_FORMAT, type ConfigBundle } from '../../schemas/bundle';
import type { OnboardingAnswers } from '../../schemas/onboarding';
import { getTemplate, type PlanTemplate } from '../catalog';
import { createContext, DAY_BOUNDARY } from './context';
import { buildCareer, buildHabits, buildMilestones, buildNotificationPrefs } from './plan';
import { addReminders } from './reminders';
import { buildRoutine } from './routine';
import { RoutineBuilder } from './routine-builder';

export interface GenerateOptions {
  /** Override the template looked up from `answers.templateKey`. */
  template?: PlanTemplate;
}

/**
 * Turns onboarding answers into a complete, editable configuration bundle:
 * profile, plan + milestones, tracks, a daily/weekly schedule, reminders and habits.
 * The same function runs in the browser (live preview in the wizard) and on the server.
 */
export function generateBundle(
  answers: OnboardingAnswers,
  options: GenerateOptions = {},
): ConfigBundle {
  const template = options.template ?? getTemplate(answers.templateKey);
  const ctx = createContext(answers, template);
  const builder = new RoutineBuilder(ctx.start, (kind) => answers.reminders.kinds[kind] !== false);
  const anchors = buildRoutine(builder, ctx);
  addReminders(builder, ctx, anchors);

  return {
    format: CONFIG_FORMAT,
    version: 1,
    name: template.title,
    profile: {
      timezone: answers.timezone,
      dayBoundaryMinutes: DAY_BOUNDARY,
      weekStartsOn: 1,
      work: answers.work,
      sleep: answers.sleep,
      study: answers.study,
      fitness: { ...answers.fitness, days: anchors.gymDays },
      restDays: answers.restDays,
      skills: answers.skills,
      notifications: buildNotificationPrefs(answers),
    },
    plan: {
      title: answers.goal.title,
      goalType: template.goalType,
      targetRole: answers.goal.targetRole ?? null,
      targetCompanies: answers.goal.targetCompanies,
      stretchCompanies: answers.goal.stretchCompanies,
      compensationTarget: answers.goal.compensationTarget ?? null,
      description: answers.goal.description ?? null,
      startDate: ctx.start,
      deadline: answers.deadline,
      milestones: buildMilestones(ctx),
    },
    tracks: ctx.tracks,
    schedule: { name: 'My routine', description: null, activities: builder.activities },
    reminders: builder.reminders,
    habits: buildHabits(ctx, anchors.gymDays),
    career: buildCareer(answers),
  };
}
