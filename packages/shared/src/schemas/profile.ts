import { z } from 'zod';
import {
  ACTIVITY_CATEGORIES,
  REMINDER_KINDS,
  SKILL_LEVELS,
  THEME_PREFERENCES,
  WORK_PRESSURES,
} from '../constants';
import { localDateSchema, localTimeSchema, timezoneSchema, weekdaysSchema } from './common';

const text = (max: number) => z.string().trim().max(max);

export const quietHoursSchema = z.object({
  enabled: z.boolean(),
  start: localTimeSchema,
  end: localTimeSchema,
});

export const notificationPrefsSchema = z.object({
  enabled: z.boolean().default(true),
  quietHours: quietHoursSchema.default({ enabled: true, start: '01:30', end: '08:30' }),
  kinds: z.partialRecord(z.enum(REMINDER_KINDS), z.boolean()).default({}),
  mutedCategories: z.array(z.enum(ACTIVITY_CATEGORIES)).max(ACTIVITY_CATEGORIES.length).default([]),
  defaultSnoozeMinutes: z.number().int().min(1).max(240).default(10),
  hour12: z.boolean().default(true),
});
export type NotificationPrefsInput = z.infer<typeof notificationPrefsSchema>;

export const workSchema = z.object({
  enabled: z.boolean(),
  label: text(40).min(1).default('Work'),
  days: weekdaysSchema,
  start: localTimeSchema,
  end: localTimeSchema,
  commuteMinutes: z.number().int().min(0).max(240).default(0),
  pressure: z.enum(WORK_PRESSURES).nullish(),
});

export const sleepSchema = z.object({
  currentBedtime: localTimeSchema,
  currentWake: localTimeSchema,
  targetBedtime: localTimeSchema,
  targetWake: localTimeSchema,
  /** Ease bedtime from current → target in 15-minute steps. */
  gradualShift: z.boolean().default(true),
});

export const studySchema = z.object({
  weekdayMinutes: z.number().int().min(0).max(900),
  weekendMinutes: z.number().int().min(0).max(900),
  preferredWindow: z.enum(['morning', 'evening']).default('evening'),
  morningRevisionMinutes: z.number().int().min(0).max(120).default(0),
});

export const fitnessSchema = z.object({
  enabled: z.boolean(),
  sessionsPerWeek: z.number().int().min(0).max(7),
  days: weekdaysSchema,
  durationMinutes: z.number().int().min(10).max(240).default(60),
  /** Preferred start on workdays; null lets the generator pick a free evening slot. */
  time: localTimeSchema.nullish(),
});

export const skillsSchema = z.object({
  levels: z.record(z.string().max(64), z.enum(SKILL_LEVELS)).default({}),
  notes: text(2000).nullish(),
});

export const profileSchema = z.object({
  timezone: timezoneSchema,
  dayBoundaryMinutes: z.number().int().min(0).max(720),
  weekStartsOn: z.union([z.literal(1), z.literal(7)]),
  professional: z.object({
    designation: text(80).nullish(),
    organization: text(120).nullish(),
    workPressure: z.enum(WORK_PRESSURES).nullish(),
  }),
  education: z.object({
    degree: text(80).nullish(),
    field: text(120).nullish(),
    institution: text(160).nullish(),
    grade: text(40).nullish(),
  }),
  work: workSchema,
  sleep: sleepSchema,
  study: studySchema,
  fitness: fitnessSchema,
  restDays: weekdaysSchema,
  skills: skillsSchema,
  notifications: notificationPrefsSchema,
  revisionIntervals: z
    .array(z.number().int().min(1).max(365))
    .min(1)
    .max(10)
    .refine((list) => list.every((v, i) => i === 0 || v >= list[i - 1]!), {
      message: 'Intervals must not decrease',
    }),
  missedGraceMinutes: z.number().int().min(0).max(240),
  theme: z.enum(THEME_PREFERENCES),
});
export type ProfileInput = z.infer<typeof profileSchema>;

export const profilePatchSchema = profileSchema.partial();
export type ProfilePatch = z.infer<typeof profilePatchSchema>;

export const GOAL_TYPES = [
  'interview',
  'exam',
  'competitive_programming',
  'skill',
  'career_transition',
  'custom',
] as const;
export type GoalType = (typeof GOAL_TYPES)[number];

export const milestoneInputSchema = z.object({
  title: text(160).min(1),
  dueDate: localDateSchema,
  completed: z.boolean().default(false),
  note: text(500).nullish(),
});
export type MilestoneInput = z.infer<typeof milestoneInputSchema>;

const planFields = {
  title: text(120).min(1),
  goalType: z.enum(GOAL_TYPES).default('custom'),
  targetRole: text(120).nullish(),
  targetCompanies: z.array(text(60).min(1)).max(50).default([]),
  stretchCompanies: z.array(text(60).min(1)).max(50).default([]),
  compensationTarget: text(60).nullish(),
  description: text(2000).nullish(),
  startDate: localDateSchema,
  deadline: localDateSchema,
  milestones: z.array(milestoneInputSchema).max(60).default([]),
};

export const planInputSchema = z.object(planFields).refine((p) => p.deadline > p.startDate, {
  message: 'The deadline must be after the start date',
  path: ['deadline'],
});
export type PlanInput = z.infer<typeof planInputSchema>;

export const planPatchSchema = z.object(planFields).partial();
export type PlanPatch = z.infer<typeof planPatchSchema>;
