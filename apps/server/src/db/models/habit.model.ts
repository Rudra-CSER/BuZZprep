import type { ActivityCategory } from '@buzzprep/shared';
import { Schema, model, type Types } from 'mongoose';

export interface IHabit {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  name: string;
  description: string | null;
  targetPerWeek: number;
  days: number[];
  linkedCategory: ActivityCategory | null;
  graceMissesPerWeek: number;
  color: string | null;
  order: number;
  archived: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const habitSchema = new Schema<IHabit>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true, maxlength: 80 },
    description: { type: String, default: null, maxlength: 300 },
    targetPerWeek: { type: Number, default: 7, min: 1, max: 7 },
    days: { type: [Number], default: [] },
    linkedCategory: { type: String, default: null },
    graceMissesPerWeek: { type: Number, default: 1, min: 0, max: 3 },
    color: { type: String, default: null },
    order: { type: Number, default: 0 },
    archived: { type: Boolean, default: false },
  },
  { timestamps: true },
);
habitSchema.index({ userId: 1, archived: 1, order: 1 });

export const Habit = model<IHabit>('Habit', habitSchema);
