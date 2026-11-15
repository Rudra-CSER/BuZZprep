import { Schema, model, type Types } from 'mongoose';

export interface IWeeklyReview {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  weekStart: string;
  stats: Record<string, unknown>;
  journalEntryId: Types.ObjectId | null;
  focusNextWeek: string[];
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
  },
  { timestamps: true, minimize: false },
);
weeklyReviewSchema.index({ userId: 1, weekStart: 1 }, { unique: true });

export const WeeklyReview = model<IWeeklyReview>('WeeklyReview', weeklyReviewSchema);
