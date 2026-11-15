import { z } from 'zod';
import {
  DEFAULT_WIND_DOWN_MINUTES,
  JOURNAL_TYPES,
  MOODS,
  PROBLEM_OUTCOMES,
  TOPIC_CONFIDENCE,
} from '../constants';
import { localDateSchema, localTimeSchema, weekdaySchema } from './common';

const line = (max: number) => z.string().trim().max(max);
const item = (max: number) => line(max).min(1);

// ── Notes (generated from the night log, editable by the user) ─────────────────

export const journalTopicSchema = z.object({
  name: item(120),
  keyPoints: z.array(item(400)).max(12),
  confidence: z.enum(TOPIC_CONFIDENCE).nullable(),
});

export const journalProblemSchema = z.object({
  name: item(160),
  outcome: z.enum(PROBLEM_OUTCOMES).nullable(),
  note: line(400).nullable(),
});

export const journalNotesSchema = z.object({
  summary: line(1200),
  topics: z.array(journalTopicSchema).max(20),
  problems: z.array(journalProblemSchema).max(30),
  mistakes: z.array(item(400)).max(20),
  questions: z.array(item(400)).max(20),
  reviseNext: z.array(item(300)).max(20),
});
export type JournalNotes = z.infer<typeof journalNotesSchema>;
export type JournalTopic = z.infer<typeof journalTopicSchema>;
export type JournalProblem = z.infer<typeof journalProblemSchema>;

// ── Weekly summary (generated on demand or on a schedule) ──────────────────────

export const weeklySummarySchema = z.object({
  headline: line(300),
  wins: z.array(item(300)).max(10),
  topics: z.array(z.object({ name: item(120), summary: line(600) })).max(20),
  weakSpots: z.array(item(300)).max(10),
  revisionPlan: z.array(z.object({ topic: item(120), task: item(300), why: line(300) })).max(12),
  nextWeek: z.array(item(300)).max(8),
});
export type WeeklySummary = z.infer<typeof weeklySummarySchema>;

// ── Entries ────────────────────────────────────────────────────────────────────

export const journalTypeSchema = z.enum(JOURNAL_TYPES);

export const journalEntryInputSchema = z.object({
  title: line(160).nullish(),
  mood: z.enum(MOODS).nullish(),
  energy: z.number().int().min(1).max(5).nullish(),
  /** Typed log or free text. */
  body: z.string().max(50_000).nullish(),
  /** Answers to the type's guided prompts, by prompt key. */
  answers: z
    .array(z.object({ key: z.string().min(1).max(40), answer: z.string().max(10_000) }))
    .max(20)
    .optional(),
  /** Notes written or edited by the user (replaces generated notes). */
  notes: journalNotesSchema.nullish(),
  tags: z.array(item(40)).max(20).optional(),
  /** Finish (or reopen) the entry. Finishing the night journal skips its reminder. */
  completed: z.boolean().optional(),
});
export type JournalEntryInput = z.infer<typeof journalEntryInputSchema>;

export const journalRangeQuerySchema = z
  .object({
    from: localDateSchema,
    to: localDateSchema,
    type: journalTypeSchema.optional(),
  })
  .refine((q) => q.from <= q.to, { message: '"from" must not be after "to"', path: ['to'] });

export const journalSearchQuerySchema = z.object({
  q: z.string().trim().min(2).max(100),
});

export const journalExportQuerySchema = z.object({
  format: z.enum(['markdown', 'json']).default('markdown'),
  from: localDateSchema.optional(),
  to: localDateSchema.optional(),
});

// ── Preferences ────────────────────────────────────────────────────────────────

const weeklySummaryPrefsSchema = z.object({
  /** Generate the weekly summary automatically on `weekday` at `time` (local). */
  auto: z.boolean(),
  weekday: weekdaySchema,
  time: localTimeSchema,
});

const journalPrefsBase = z.object({
  /** Minutes before bedtime when the night journal opens and its reminder fires. */
  windDownMinutes: z.number().int().min(5).max(60),
  nightReminder: z.boolean(),
  /**
   * Use the server's AI provider for this journal: transcribe voice logs and write notes from
   * them. Off means typed logs only, and nothing leaves the server.
   */
  useAi: z.boolean(),
  /** Keep voice recordings after transcription (deleted by default). */
  keepAudio: z.boolean(),
  weeklySummary: weeklySummaryPrefsSchema,
});
export type JournalPrefs = z.infer<typeof journalPrefsBase>;
export const journalPrefsSchema = journalPrefsBase;

export const DEFAULT_JOURNAL_PREFS: JournalPrefs = {
  windDownMinutes: DEFAULT_WIND_DOWN_MINUTES,
  nightReminder: true,
  useAi: true,
  keepAudio: false,
  weeklySummary: { auto: false, weekday: 7, time: '10:00' },
};

/** Partial update. Deliberately without defaults, so missing fields stay unchanged. */
export const journalPrefsPatchSchema = journalPrefsBase
  .extend({ weeklySummary: weeklySummaryPrefsSchema.partial() })
  .partial();
export type JournalPrefsPatch = z.infer<typeof journalPrefsPatchSchema>;

/** Stored preferences with defaults for anything missing or invalid (older profiles). */
export function resolveJournalPrefs(stored: unknown): JournalPrefs {
  const s = (stored && typeof stored === 'object' ? stored : {}) as Record<string, unknown>;
  const pick = <K extends keyof JournalPrefs>(key: K): JournalPrefs[K] => {
    const parsed = journalPrefsBase.shape[key].safeParse(s[key]);
    return (parsed.success ? parsed.data : DEFAULT_JOURNAL_PREFS[key]) as JournalPrefs[K];
  };
  const weekly = (s.weeklySummary ?? {}) as Record<string, unknown>;
  const pickWeekly = <K extends keyof JournalPrefs['weeklySummary']>(key: K) => {
    const parsed = weeklySummaryPrefsSchema.shape[key].safeParse(weekly[key]);
    return (
      parsed.success ? parsed.data : DEFAULT_JOURNAL_PREFS.weeklySummary[key]
    ) as JournalPrefs['weeklySummary'][K];
  };
  return {
    windDownMinutes: pick('windDownMinutes'),
    nightReminder: pick('nightReminder'),
    useAi: pick('useAi'),
    keepAudio: pick('keepAudio'),
    weeklySummary: {
      auto: pickWeekly('auto'),
      weekday: pickWeekly('weekday'),
      time: pickWeekly('time'),
    },
  };
}

export function mergeJournalPrefs(current: JournalPrefs, patch: JournalPrefsPatch): JournalPrefs {
  return {
    ...current,
    ...Object.fromEntries(
      Object.entries(patch).filter(([k, v]) => k !== 'weeklySummary' && v !== undefined),
    ),
    weeklySummary: {
      ...current.weeklySummary,
      ...Object.fromEntries(
        Object.entries(patch.weeklySummary ?? {}).filter(([, v]) => v !== undefined),
      ),
    },
  } as JournalPrefs;
}
