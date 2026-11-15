import type { ReminderAnchor, ReminderKind, Recurrence } from '@buzzprep/shared';
import { Schema, model, type Types } from 'mongoose';

const mixed = { type: Schema.Types.Mixed };

export interface IReminder {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  kind: ReminderKind;
  anchor: ReminderAnchor;
  activityId: Types.ObjectId | null;
  offsetMinutes: number;
  time: string | null;
  recurrence: Recurrence | null;
  daysBefore: number[] | null;
  title: string | null;
  body: string | null;
  enabled: boolean;
  bypassQuietHours: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const reminderSchema = new Schema<IReminder>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    kind: { type: String, required: true },
    anchor: { type: String, required: true },
    activityId: { type: Schema.Types.ObjectId, ref: 'Activity', default: null },
    offsetMinutes: { type: Number, default: 0 },
    time: { type: String, default: null },
    recurrence: { ...mixed, default: null },
    daysBefore: { type: [Number], default: null },
    title: { type: String, default: null, maxlength: 120 },
    body: { type: String, default: null, maxlength: 300 },
    enabled: { type: Boolean, default: true },
    bypassQuietHours: { type: Boolean, default: false },
  },
  { timestamps: true },
);
reminderSchema.index({ userId: 1, activityId: 1 });

export const Reminder = model<IReminder>('Reminder', reminderSchema);
