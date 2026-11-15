import type {
  ActivityCategory,
  ModeAction,
  Priority,
  Recurrence,
  ScheduleMode,
  TimeProgression,
} from '@buzzprep/shared';
import { Schema, model, type Types } from 'mongoose';

const mixed = { type: Schema.Types.Mixed };

/** A recurring activity (the "ScheduledActivity" of the spec). */
export interface IActivity {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  templateId: Types.ObjectId;
  title: string;
  description: string | null;
  category: ActivityCategory;
  startTime: string;
  durationMinutes: number;
  recurrence: Recurrence;
  priority: Priority;
  essential: boolean;
  blocking: boolean;
  trackId: Types.ObjectId | null;
  color: string | null;
  modeBehavior: Partial<Record<ScheduleMode, ModeAction>> | null;
  progression: TimeProgression | null;
  notes: string | null;
  archived: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const activitySchema = new Schema<IActivity>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    templateId: { type: Schema.Types.ObjectId, ref: 'ScheduleTemplate', required: true },
    title: { type: String, required: true, maxlength: 120 },
    description: { type: String, default: null, maxlength: 2000 },
    category: { type: String, required: true },
    startTime: { type: String, required: true },
    durationMinutes: { type: Number, required: true, min: 0, max: 1440 },
    recurrence: { ...mixed, required: true },
    priority: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
    essential: { type: Boolean, default: false },
    blocking: { type: Boolean, default: true },
    trackId: { type: Schema.Types.ObjectId, ref: 'LearningTrack', default: null },
    color: { type: String, default: null },
    modeBehavior: { ...mixed, default: null },
    progression: { ...mixed, default: null },
    notes: { type: String, default: null, maxlength: 5000 },
    archived: { type: Boolean, default: false },
  },
  { timestamps: true },
);
activitySchema.index({ userId: 1, templateId: 1, archived: 1 });

export const Activity = model<IActivity>('Activity', activitySchema);
