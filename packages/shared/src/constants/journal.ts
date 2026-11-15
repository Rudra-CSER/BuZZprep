/** Journal entry types, guided prompts, moods and the vocabulary of journal notes. */

export const JOURNAL_TYPES = ['morning', 'evening', 'weekly', 'freeform'] as const;
export type JournalType = (typeof JOURNAL_TYPES)[number];

export interface JournalPrompt {
  key: string;
  question: string;
}

/**
 * The night journal is the `evening` entry: a mood check-in, a spoken or typed walk-through of
 * what was studied, and these two closing prompts. Kept short on purpose: it happens in the last
 * few minutes before sleep.
 */
export const NIGHT_PROMPTS: JournalPrompt[] = [
  { key: 'unfinished', question: 'Anything you didn’t get to?' },
  { key: 'tomorrow', question: 'First thing tomorrow?' },
];

export const JOURNAL_PROMPTS: Record<Exclude<JournalType, 'freeform'>, JournalPrompt[]> = {
  morning: [
    { key: 'top3', question: 'What are today’s three most important tasks?' },
    { key: 'achieve', question: 'What do I want to achieve today?' },
    { key: 'energy', question: 'How is my current energy level?' },
    { key: 'distractions', question: 'Is there anything distracting me?' },
  ],
  evening: NIGHT_PROMPTS,
  weekly: [
    { key: 'sessions', question: 'How many study sessions did I complete?' },
    { key: 'dsa_independent', question: 'How many DSA problems did I independently solve?' },
    { key: 'sd_concepts', question: 'What System Design concepts did I learn?' },
    { key: 'balance', question: 'How was my work-life balance?' },
    { key: 'exercise', question: 'Did I exercise?' },
    { key: 'interruptions', question: 'What caused interruptions?' },
    { key: 'change', question: 'What should change next week?' },
  ],
};

export const MOODS = ['great', 'good', 'okay', 'low', 'rough'] as const;
export type Mood = (typeof MOODS)[number];

export const MOOD_LABEL: Record<Mood, string> = {
  great: 'Great',
  good: 'Good',
  okay: 'Okay',
  low: 'Low',
  rough: 'Rough',
};

/** How long before bedtime the night journal opens (and its reminder fires). */
export const WIND_DOWN_OPTIONS = [5, 10, 15, 20, 30] as const;
export const DEFAULT_WIND_DOWN_MINUTES = 10;

/** How well a topic seems understood, judged from how it was explained. */
export const TOPIC_CONFIDENCE = ['shaky', 'okay', 'solid'] as const;
export type TopicConfidence = (typeof TOPIC_CONFIDENCE)[number];

/** Voice clips: uploaded → transcribing → transcribed (audio deleted unless kept) | failed. */
export const CLIP_STATUSES = ['uploaded', 'transcribing', 'transcribed', 'failed'] as const;
export type ClipStatus = (typeof CLIP_STATUSES)[number];

/** Background AI work on notes and weekly summaries. */
export const AI_TASK_STATUSES = ['idle', 'queued', 'running', 'ready', 'failed'] as const;
export type AiTaskStatus = (typeof AI_TASK_STATUSES)[number];

/** Who wrote the current notes: generated from the log, or written/edited by the user. */
export const NOTES_SOURCES = ['ai', 'manual'] as const;
export type NotesSource = (typeof NOTES_SOURCES)[number];

/** Upper bounds for voice clips (the cloud transcription API accepts files up to 25 MB). */
export const MAX_CLIP_SECONDS = 15 * 60;
export const MAX_CLIP_BYTES = 25 * 1024 * 1024;
export const MAX_CLIPS_PER_ENTRY = 12;
