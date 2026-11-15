import type {
  ActivityCategory,
  AiTaskStatus,
  ClipStatus,
  CompiledWeek,
  JournalNotes,
  JournalPrefs,
  JournalPrompt,
  JournalType,
  LocalDate,
  Mood,
  NotesSource,
  OccurrenceStatus,
  WeeklySummary,
} from '@buzzprep/shared';

/** Shapes of the /v1/journal API. */

export interface JournalClip {
  id: string;
  mimeType: string;
  bytes: number;
  durationSeconds: number;
  status: ClipStatus;
  transcript: string | null;
  error: string | null;
  hasAudio: boolean;
  createdAt: string;
}

export interface JournalEntry {
  id: string;
  type: JournalType;
  date: LocalDate;
  title: string | null;
  mood: Mood | null;
  energy: number | null;
  body: string | null;
  answers: { key: string; question: string; answer: string }[];
  tags: string[];
  clips: JournalClip[];
  notes: JournalNotes | null;
  notesSource: NotesSource | null;
  notesStatus: AiTaskStatus;
  notesError: string | null;
  notesModel: string | null;
  notesUpdatedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface JournalEntrySummary {
  id: string;
  type: JournalType;
  date: LocalDate;
  title: string | null;
  mood: Mood | null;
  energy: number | null;
  completed: boolean;
  hasNotes: boolean;
  notesStatus: AiTaskStatus;
  summary: string | null;
  topics: string[];
  clipCount: number;
}

export interface SearchResult extends JournalEntrySummary {
  match: string | null;
}

export interface StudiedSession {
  activityId: string;
  title: string;
  category: ActivityCategory;
  start: string;
  status: OccurrenceStatus;
  minutes: number;
}

export interface TonightResponse {
  date: LocalDate;
  today: LocalDate;
  timezone: string;
  hour12: boolean;
  bedtime: string | null;
  opensAt: string | null;
  windDownMinutes: number;
  studied: StudiedSession[];
  prompts: JournalPrompt[];
  entry: JournalEntry | null;
  ai: {
    /** Voice logs can be transcribed (server has a provider and the user allows AI). */
    voice: boolean;
    notes: boolean;
    useAi: boolean;
    server: { transcription: boolean; notes: boolean };
  };
}

export interface ProviderInfo {
  provider: string;
  model: string;
}

export interface JournalSettingsResponse {
  prefs: JournalPrefs;
  ai: {
    transcription: boolean;
    notes: boolean;
    providers: { transcription: ProviderInfo | null; notes: ProviderInfo | null };
  };
}

export interface WeekResponse {
  weekStart: LocalDate;
  weekEnd: LocalDate;
  today: LocalDate;
  days: { date: LocalDate; entry: JournalEntrySummary | null }[];
  week: CompiledWeek;
  sessions: { planned: number; done: number; skipped: number };
  summary: WeeklySummary | null;
  summaryStatus: AiTaskStatus;
  summaryError: string | null;
  summaryModel: string | null;
  summaryGeneratedAt: string | null;
  ai: { summary: boolean };
}
