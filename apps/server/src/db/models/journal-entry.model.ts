import type {
  AiTaskStatus,
  ClipStatus,
  JournalNotes,
  JournalType,
  Mood,
  NotesSource,
} from '@buzzprep/shared';
import { Schema, model, type Types } from 'mongoose';

/** One voice recording of the night log. The audio itself lives in GridFS until transcribed. */
export interface IJournalClip {
  _id: Types.ObjectId;
  /** GridFS file id; null once the audio is deleted (the default after transcription). */
  fileId: Types.ObjectId | null;
  mimeType: string;
  bytes: number;
  durationSeconds: number;
  status: ClipStatus;
  transcript: string | null;
  error: string | null;
  createdAt: Date;
}

/**
 * Journals are private: every query is scoped to the owner, and there is no endpoint that
 * exposes them to anyone else (admins included).
 *
 * The night journal is the `evening` entry: mood and energy, the study log (typed in `body`
 * and/or spoken in `clips`), answers to the closing prompts, and notes generated from the log
 * (or written by the user).
 */
export interface IJournalEntry {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  type: JournalType;
  /** Logical date (weekly reflections use the first day of the week). */
  date: string;
  title: string | null;
  answers: { key: string; question: string; answer: string }[];
  body: string | null;
  mood: Mood | null;
  energy: number | null;
  tags: string[];
  clips: IJournalClip[];
  notes: JournalNotes | null;
  notesSource: NotesSource | null;
  notesStatus: AiTaskStatus;
  notesError: string | null;
  notesModel: string | null;
  notesUpdatedAt: Date | null;
  /** Hash of the log the current notes were written from (skip regenerating unchanged logs). */
  notesInputHash: string | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const clipSchema = new Schema<IJournalClip>(
  {
    fileId: { type: Schema.Types.ObjectId, default: null },
    mimeType: { type: String, required: true, maxlength: 100 },
    bytes: { type: Number, required: true, min: 0 },
    durationSeconds: { type: Number, default: 0, min: 0 },
    status: {
      type: String,
      enum: ['uploaded', 'transcribing', 'transcribed', 'failed'],
      default: 'uploaded',
    },
    transcript: { type: String, default: null, maxlength: 60_000 },
    error: { type: String, default: null, maxlength: 500 },
    createdAt: { type: Date, default: () => new Date() },
  },
  { _id: true },
);

const journalSchema = new Schema<IJournalEntry>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['morning', 'evening', 'weekly', 'freeform'], required: true },
    date: { type: String, required: true },
    title: { type: String, default: null, maxlength: 160 },
    answers: {
      type: [
        new Schema(
          {
            key: { type: String, required: true, maxlength: 40 },
            question: { type: String, required: true, maxlength: 300 },
            answer: { type: String, default: '', maxlength: 10_000 },
          },
          { _id: false },
        ),
      ],
      default: [],
    },
    body: { type: String, default: null, maxlength: 50_000 },
    mood: { type: String, default: null },
    energy: { type: Number, default: null, min: 1, max: 5 },
    tags: { type: [String], default: [] },
    clips: { type: [clipSchema], default: [] },
    notes: { type: Schema.Types.Mixed, default: null },
    notesSource: { type: String, enum: ['ai', 'manual', null], default: null },
    notesStatus: {
      type: String,
      enum: ['idle', 'queued', 'running', 'ready', 'failed'],
      default: 'idle',
    },
    notesError: { type: String, default: null, maxlength: 500 },
    notesModel: { type: String, default: null, maxlength: 100 },
    notesUpdatedAt: { type: Date, default: null },
    notesInputHash: { type: String, default: null, maxlength: 64 },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true, minimize: false },
);
journalSchema.index(
  { userId: 1, type: 1, date: 1 },
  { unique: true, partialFilterExpression: { type: { $in: ['morning', 'evening', 'weekly'] } } },
);
journalSchema.index({ userId: 1, date: -1 });
journalSchema.index({ title: 'text', body: 'text', 'answers.answer': 'text', tags: 'text' });

export const JournalEntry = model<IJournalEntry>('JournalEntry', journalSchema);
