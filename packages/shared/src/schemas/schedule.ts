import { z } from 'zod';
import {
  ACTIVITY_CATEGORIES,
  MODE_ACTIONS,
  PRIORITIES,
  REMINDER_ANCHORS,
  REMINDER_KINDS,
  SCHEDULE_MODES,
} from '../constants';
import { toLogicalMinutes } from '../time';
import {
  localDateSchema,
  localTimeSchema,
  objectIdSchema,
  refSchema,
  weekdaysSchema,
} from './common';

const interval = z.number().int().min(1).max(52).default(1);

export const recurrenceSchema = z
  .discriminatedUnion('freq', [
    z.object({ freq: z.literal('once'), date: localDateSchema }),
    z.object({
      freq: z.literal('daily'),
      interval,
      startDate: localDateSchema,
      endDate: localDateSchema.nullish(),
    }),
    z.object({
      freq: z.literal('weekly'),
      interval,
      byWeekday: weekdaysSchema.refine((d) => d.length > 0, { message: 'Pick at least one day' }),
      startDate: localDateSchema,
      endDate: localDateSchema.nullish(),
    }),
    z.object({
      freq: z.literal('monthly'),
      interval,
      byMonthDay: z
        .array(
          z
            .number()
            .int()
            .min(-1)
            .max(31)
            .refine((d) => d !== 0),
        )
        .min(1)
        .max(31),
      startDate: localDateSchema,
      endDate: localDateSchema.nullish(),
    }),
  ])
  .refine((r) => r.freq === 'once' || !r.endDate || r.endDate >= r.startDate, {
    message: 'End date must be on or after the start date',
    path: ['endDate'],
  });

export const progressionSchema = z.object({
  fromTime: localTimeSchema,
  stepMinutes: z.number().int().min(5).max(60),
  everyDays: z.number().int().min(1).max(14),
  startDate: localDateSchema,
  keepEnd: z.boolean().default(false),
});

export const modeBehaviorSchema = z.partialRecord(z.enum(SCHEDULE_MODES), z.enum(MODE_ACTIONS));

const activityFields = {
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(2000).nullish(),
  category: z.enum(ACTIVITY_CATEGORIES),
  startTime: localTimeSchema,
  durationMinutes: z.number().int().min(0).max(1440),
  recurrence: recurrenceSchema,
  priority: z.enum(PRIORITIES).default('medium'),
  essential: z.boolean().default(false),
  /** Defaults from the category when omitted. */
  blocking: z.boolean().optional(),
  trackId: objectIdSchema.nullish(),
  color: z.string().max(32).nullish(),
  modeBehavior: modeBehaviorSchema.nullish(),
  progression: progressionSchema.nullish(),
  notes: z.string().max(5000).nullish(),
};

export const activityInputSchema = z.object(activityFields);
export const activityPatchSchema = z.object(activityFields).partial();
export type ActivityInput = z.infer<typeof activityInputSchema>;
export type ActivityPatch = z.infer<typeof activityPatchSchema>;

/** The three common per-activity reminders, as edited in the activity form. */
export const activityReminderPresetsSchema = z.object({
  /** Minutes before the start, or null for none. */
  upcomingMinutes: z.number().int().min(1).max(240).nullable(),
  atStart: z.boolean(),
  /** Minutes after the end if not marked done, or null for none. */
  overdueMinutes: z.number().int().min(1).max(240).nullable(),
});
export type ActivityReminderPresets = z.infer<typeof activityReminderPresetsSchema>;

export const activityCreateSchema = activityInputSchema.extend({
  scheduleId: objectIdSchema.optional(),
  reminders: activityReminderPresetsSchema.optional(),
});
export const activityUpdateSchema = activityPatchSchema.extend({
  reminders: activityReminderPresetsSchema.optional(),
});
export type ActivityCreateInput = z.infer<typeof activityCreateSchema>;
export type ActivityUpdateInput = z.infer<typeof activityUpdateSchema>;

export const occurrenceUpdateSchema = z
  .object({
    status: z.enum(['pending', 'completed', 'skipped']).optional(),
    note: z.string().trim().max(2000).nullish(),
    actualMinutes: z.number().int().min(0).max(1440).nullish(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: 'Nothing to update' });
export type OccurrenceUpdateInput = z.infer<typeof occurrenceUpdateSchema>;

export const rescheduleSchema = z.object({
  date: localDateSchema,
  startTime: localTimeSchema,
  durationMinutes: z.number().int().min(5).max(720).optional(),
});
export type RescheduleInput = z.infer<typeof rescheduleSchema>;

export const postponeSchema = z.object({
  minutes: z
    .number()
    .int()
    .min(5)
    .max(24 * 60),
});

export const dayModeSchema = z.object({
  mode: z.enum(SCHEDULE_MODES),
  note: z.string().trim().max(500).nullish(),
  /** Apply the same mode through this date (inclusive). */
  until: localDateSchema.optional(),
});
export type DayModeInput = z.infer<typeof dayModeSchema>;

export const agendaQuerySchema = z
  .object({ from: localDateSchema, to: localDateSchema })
  .refine((v) => v.from <= v.to, { message: '"from" must not be after "to"', path: ['to'] });
export type AgendaQuery = z.infer<typeof agendaQuerySchema>;

export const scheduleTemplateInputSchema = z.object({
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().max(500).nullish(),
});
export type ScheduleTemplateInput = z.infer<typeof scheduleTemplateInputSchema>;

const reminderFields = {
  kind: z.enum(REMINDER_KINDS),
  anchor: z.enum(REMINDER_ANCHORS),
  offsetMinutes: z.number().int().min(-1440).max(1440).default(0),
  time: localTimeSchema.nullish(),
  recurrence: recurrenceSchema.nullish(),
  daysBefore: z.array(z.number().int().min(0).max(90)).max(6).nullish(),
  title: z.string().trim().max(120).nullish(),
  body: z.string().trim().max(300).nullish(),
  enabled: z.boolean().default(true),
  bypassQuietHours: z.boolean().default(false),
};

type ReminderShape = {
  anchor: (typeof REMINDER_ANCHORS)[number];
  time?: string | null;
  recurrence?: unknown;
};

function checkReminder(v: ReminderShape & { activity?: unknown }, ctx: z.RefinementCtx) {
  if ((v.anchor === 'activity_start' || v.anchor === 'activity_end') && !v.activity) {
    ctx.addIssue({
      code: 'custom',
      message: 'Activity reminders need an activity',
      path: ['anchor'],
    });
  }
  if ((v.anchor === 'time' || v.anchor === 'milestone') && !v.time) {
    ctx.addIssue({ code: 'custom', message: 'A time is required', path: ['time'] });
  }
  if (v.anchor === 'time' && !v.recurrence) {
    ctx.addIssue({ code: 'custom', message: 'Choose which days', path: ['recurrence'] });
  }
}

export const reminderInputSchema = z
  .object({ ...reminderFields, activityId: objectIdSchema.nullish() })
  .superRefine((v, ctx) => checkReminder({ ...v, activity: v.activityId }, ctx));
export const reminderPatchSchema = z
  .object({ ...reminderFields, activityId: objectIdSchema.nullish() })
  .partial();
export type ReminderInput = z.infer<typeof reminderInputSchema>;
export type ReminderPatch = z.infer<typeof reminderPatchSchema>;

/** Bundle variants reference other bundle entries by `ref` instead of database ids. */
export const activityBundleSchema = z.object({
  ...activityFields,
  ref: refSchema,
  trackId: z.never().optional(),
  trackRef: refSchema.nullish(),
});
export type ActivityBundle = z.infer<typeof activityBundleSchema>;

export const reminderBundleSchema = z
  .object({ ...reminderFields, activityRef: refSchema.nullish() })
  .superRefine((v, ctx) => checkReminder({ ...v, activity: v.activityRef }, ctx));
export type ReminderBundle = z.infer<typeof reminderBundleSchema>;

/** Logical-minute helper used by the UI to validate time ordering. */
export function logicalOrder(time: string, boundaryMinutes: number): number {
  return toLogicalMinutes(time, boundaryMinutes);
}
