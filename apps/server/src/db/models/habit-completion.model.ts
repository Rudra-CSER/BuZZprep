import { Schema, model, type Types } from 'mongoose';

export interface IHabitCompletion {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  habitId: Types.ObjectId;
  date: string;
  value: number;
  source: 'manual' | 'auto';
  note: string | null;
  createdAt: Date;
}

const habitCompletionSchema = new Schema<IHabitCompletion>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    habitId: { type: Schema.Types.ObjectId, ref: 'Habit', required: true },
    date: { type: String, required: true },
    value: { type: Number, default: 1 },
    source: { type: String, enum: ['manual', 'auto'], default: 'manual' },
    note: { type: String, default: null, maxlength: 300 },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);
habitCompletionSchema.index({ habitId: 1, date: 1 }, { unique: true });
habitCompletionSchema.index({ userId: 1, date: 1 });

export const HabitCompletion = model<IHabitCompletion>('HabitCompletion', habitCompletionSchema);
