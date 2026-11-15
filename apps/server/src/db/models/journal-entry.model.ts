import type { JournalType, Mood } from '@buzzprep/shared';
import { Schema, model, type Types } from 'mongoose';

/**
 * Journals are private: every query is scoped to the owner, and there is no endpoint that
 * exposes them to anyone else (admins included).
 */
export interface IJournalEntry {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  type: JournalType;
  /** Logical date (weekly reflections use the week's Monday). */
  date: string;
  title: string | null;
  answers: { key: string; question: string; answer: string }[];
  body: string | null;
  mood: Mood | null;
  energy: number | null;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

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
  },
  { timestamps: true },
);
journalSchema.index(
  { userId: 1, type: 1, date: 1 },
  { unique: true, partialFilterExpression: { type: { $in: ['morning', 'evening', 'weekly'] } } },
);
journalSchema.index({ userId: 1, date: -1 });
journalSchema.index({ title: 'text', body: 'text', 'answers.answer': 'text', tags: 'text' });

export const JournalEntry = model<IJournalEntry>('JournalEntry', journalSchema);
