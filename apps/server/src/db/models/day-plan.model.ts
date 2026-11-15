import type { ScheduleMode } from '@buzzprep/shared';
import { Schema, model, type Types } from 'mongoose';

/** Schedule mode for one logical day (absent = normal). */
export interface IDayPlan {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  date: string;
  mode: ScheduleMode;
  note: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const dayPlanSchema = new Schema<IDayPlan>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: String, required: true },
    mode: { type: String, enum: ['normal', 'busy', 'low_energy', 'recovery'], required: true },
    note: { type: String, default: null, maxlength: 500 },
  },
  { timestamps: true },
);
dayPlanSchema.index({ userId: 1, date: 1 }, { unique: true });

export const DayPlan = model<IDayPlan>('DayPlan', dayPlanSchema);
