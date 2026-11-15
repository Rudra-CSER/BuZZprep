import type { OccurrenceOverride, OccurrenceStatus } from '@buzzprep/shared';
import { Schema, model, type Types } from 'mongoose';

const mixed = { type: Schema.Types.Mixed };

/** Persisted state of one occurrence: completion, skip, reschedule, notes. */
export interface IActivityOccurrence {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  activityId: Types.ObjectId;
  date: string;
  status: OccurrenceStatus;
  override: OccurrenceOverride | null;
  completedAt: Date | null;
  skippedAt: Date | null;
  actualMinutes: number | null;
  note: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const occurrenceSchema = new Schema<IActivityOccurrence>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    activityId: { type: Schema.Types.ObjectId, ref: 'Activity', required: true },
    date: { type: String, required: true },
    status: { type: String, enum: ['pending', 'completed', 'skipped'], default: 'pending' },
    override: { ...mixed, default: null },
    completedAt: { type: Date, default: null },
    skippedAt: { type: Date, default: null },
    actualMinutes: { type: Number, default: null },
    note: { type: String, default: null, maxlength: 2000 },
  },
  { timestamps: true },
);
occurrenceSchema.index({ userId: 1, activityId: 1, date: 1 }, { unique: true });
occurrenceSchema.index({ userId: 1, date: 1 });
occurrenceSchema.index({ userId: 1, 'override.date': 1 });

export const ActivityOccurrence = model<IActivityOccurrence>(
  'ActivityOccurrence',
  occurrenceSchema,
);
