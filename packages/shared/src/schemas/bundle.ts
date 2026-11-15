import { z } from 'zod';
import { ACTIVITY_CATEGORIES, APPLICATION_STAGES, TRACK_KINDS } from '../constants';
import { refSchema, urlSchema, weekdaysSchema } from './common';
import { onboardingAnswersSchema } from './onboarding';
import { planInputSchema, profilePatchSchema } from './profile';
import { activityBundleSchema, reminderBundleSchema } from './schedule';

/**
 * Config bundle — ONE portable format for:
 *   built-in templates · onboarding output · personal seed files · import/export.
 * Entries reference each other with `ref`s; the server maps refs to database ids on import.
 * Bundles never contain journals, problems or other history — that is what the full
 * account export (/api/v1/account/export) is for.
 */

export const CONFIG_FORMAT = 'buzzprep.config' as const;

const text = (max: number) => z.string().trim().max(max);

export const RESOURCE_TYPES = ['video', 'article', 'course', 'book', 'sheet', 'other'] as const;

export const resourceSchema = z.object({
  title: text(120).min(1),
  url: urlSchema.nullish(),
  type: z.enum(RESOURCE_TYPES).default('other'),
});

export const TOPIC_TYPES = ['concept', 'practice'] as const;

export const topicBundleSchema = z.object({
  title: text(160).min(1),
  type: z.enum(TOPIC_TYPES).default('concept'),
  resources: z.array(resourceSchema).max(20).default([]),
  notes: text(10_000).nullish(),
});

export const trackBundleSchema = z.object({
  ref: refSchema,
  title: text(80).min(1),
  kind: z.enum(TRACK_KINDS),
  description: text(500).nullish(),
  color: text(32).nullish(),
  resources: z.array(resourceSchema).max(20).default([]),
  topics: z.array(topicBundleSchema).max(300).default([]),
});
export type TrackBundle = z.infer<typeof trackBundleSchema>;

export const habitBundleSchema = z.object({
  name: text(80).min(1),
  description: text(300).nullish(),
  targetPerWeek: z.number().int().min(1).max(7),
  /** Expected days; empty = any day counts toward the weekly target. */
  days: weekdaysSchema.default([]),
  /** Completing an activity in this category auto-checks the habit for that day. */
  linkedCategory: z.enum(ACTIVITY_CATEGORIES).nullish(),
  graceMissesPerWeek: z.number().int().min(0).max(3).default(1),
  color: text(32).nullish(),
});
export type HabitBundle = z.infer<typeof habitBundleSchema>;

export const APPLICATION_TIERS = ['dream', 'target', 'safe'] as const;

export const applicationBundleSchema = z.object({
  company: text(80).min(1),
  role: text(120).nullish(),
  stage: z.enum(APPLICATION_STAGES).default('interested'),
  tier: z.enum(APPLICATION_TIERS).nullish(),
  jobUrl: urlSchema.nullish(),
  notes: text(5000).nullish(),
});

export const scheduleBundleSchema = z.object({
  name: text(80).min(1),
  description: text(500).nullish(),
  activities: z.array(activityBundleSchema).max(300),
});

export const configBundleSchema = z
  .object({
    format: z.literal(CONFIG_FORMAT),
    version: z.literal(1),
    name: text(120).optional(),
    exportedAt: z.string().max(40).optional(),
    user: z
      .object({ displayName: text(60).min(1) })
      .partial()
      .optional(),
    profile: profilePatchSchema.optional(),
    plan: planInputSchema.optional(),
    tracks: z.array(trackBundleSchema).max(50).default([]),
    schedule: scheduleBundleSchema.optional(),
    reminders: z.array(reminderBundleSchema).max(500).default([]),
    habits: z.array(habitBundleSchema).max(50).default([]),
    career: z
      .object({ applications: z.array(applicationBundleSchema).max(300).default([]) })
      .optional(),
    /** The setup-wizard answers this bundle was generated from (enables "Reset to default"). */
    setup: onboardingAnswersSchema.optional(),
  })
  .superRefine((bundle, ctx) => {
    const unique = (refs: string[], path: string) => {
      const seen = new Set<string>();
      refs.forEach((ref, i) => {
        if (seen.has(ref)) {
          ctx.addIssue({
            code: 'custom',
            message: `Duplicate ref "${ref}"`,
            path: [path, i, 'ref'],
          });
        }
        seen.add(ref);
      });
      return seen;
    };
    const trackRefs = unique(
      bundle.tracks.map((t) => t.ref),
      'tracks',
    );
    const activities = bundle.schedule?.activities ?? [];
    const activityRefs = unique(
      activities.map((a) => a.ref),
      'activities',
    );
    activities.forEach((a, i) => {
      if (a.trackRef && !trackRefs.has(a.trackRef)) {
        ctx.addIssue({
          code: 'custom',
          message: `Unknown track ref "${a.trackRef}"`,
          path: ['schedule', 'activities', i, 'trackRef'],
        });
      }
    });
    bundle.reminders.forEach((r, i) => {
      if (r.activityRef && !activityRefs.has(r.activityRef)) {
        ctx.addIssue({
          code: 'custom',
          message: `Unknown activity ref "${r.activityRef}"`,
          path: ['reminders', i, 'activityRef'],
        });
      }
    });
  });

export type ConfigBundle = z.output<typeof configBundleSchema>;
export type ConfigBundleInput = z.input<typeof configBundleSchema>;

export const importModeSchema = z.object({
  /** replace: swap the active schedule/plan/reminders; merge: add alongside existing data. */
  mode: z.enum(['replace', 'merge']).default('merge'),
});
export type ImportMode = z.infer<typeof importModeSchema>['mode'];
