import type { AiTaskStatus, WeeklySummary } from '@buzzprep/shared';
import { Schema, model, type Types } from 'mongoose';

/** One week of the journal: stats, the reflection entry, and the optional AI summary. */
export interface IWeeklyReview {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  /** First day of the week (the user's week start). */
  weekStart: string;
  stats: Record<string, unknown>;
  journalEntryId: Types.ObjectId | null;
  focusNextWeek: string[];
  summary: WeeklySummary | null;
  summaryStatus: AiTaskStatus;
  summaryError: string | null;
  summaryModel: string | null;
  summaryGeneratedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const weeklyReviewSchema = new Schema<IWeeklyReview>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    weekStart: { type: String, required: true },
    stats: { type: Schema.Types.Mixed, default: () => ({}) },
    journalEntryId: { type: Schema.Types.ObjectId, ref: 'JournalEntry', default: null },
    focusNextWeek: { type: [String], default: [] },
    summary: { type: Schema.Types.Mixed, default: null },
    summaryStatus: {
      type: String,
      enum: ['idle', 'queued', 'running', 'ready', 'failed'],
      default: 'idle',
    },
    summaryError: { type: String, default: null, maxlength: 500 },
    summaryModel: { type: String, default: null, maxlength: 100 },
    summaryGeneratedAt: { type: Date, default: null },
  },
  { timestamps: true, minimize: false },
);
weeklyReviewSchema.index({ userId: 1, weekStart: 1 }, { unique: true });

export const WeeklyReview = model<IWeeklyReview>('WeeklyReview', weeklyReviewSchema);
