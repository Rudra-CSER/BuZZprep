import { z } from 'zod';
import { REMINDER_KINDS, TRACK_KINDS } from '../constants';
import { localDateSchema, refSchema, timezoneSchema, weekdaysSchema } from './common';
import {
  fitnessSchema,
  quietHoursSchema,
  skillsSchema,
  sleepSchema,
  studySchema,
  workSchema,
} from './profile';

export const TEMPLATE_KEYS = [
  'sde_interview',
  'frontend_interview',
  'backend_interview',
  'gate',
  'competitive_programming',
  'new_skill',
  'career_transition',
  'blank',
] as const;
export type TemplateKey = (typeof TEMPLATE_KEYS)[number];

const text = (max: number) => z.string().trim().max(max);

export const onboardingAnswersSchema = z
  .object({
    templateKey: z.enum(TEMPLATE_KEYS),
    timezone: timezoneSchema,
    goal: z.object({
      title: text(120).min(1),
      targetRole: text(120).nullish(),
      targetCompanies: z.array(text(60).min(1)).max(50).default([]),
      stretchCompanies: z.array(text(60).min(1)).max(50).default([]),
      compensationTarget: text(60).nullish(),
      description: text(2000).nullish(),
    }),
    startDate: localDateSchema,
    deadline: localDateSchema,
    work: workSchema,
    sleep: sleepSchema,
    study: studySchema,
    skills: skillsSchema,
    tracks: z
      .array(
        z.object({
          ref: refSchema,
          title: text(80).min(1),
          kind: z.enum(TRACK_KINDS),
          enabled: z.boolean(),
        }),
      )
      .max(20),
    reminders: z.object({
      kinds: z.partialRecord(z.enum(REMINDER_KINDS), z.boolean()).default({}),
      leadMinutes: z.number().int().min(0).max(60).default(10),
      quietHours: quietHoursSchema,
    }),
    restDays: weekdaysSchema,
    fitness: fitnessSchema,
  })
  .refine((a) => a.deadline > a.startDate, {
    message: 'The deadline must be after the start date',
    path: ['deadline'],
  });

export type OnboardingAnswers = z.output<typeof onboardingAnswersSchema>;
export type OnboardingAnswersInput = z.input<typeof onboardingAnswersSchema>;
