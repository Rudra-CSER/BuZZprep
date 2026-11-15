import { Schema, model, type Types } from 'mongoose';

export interface IScheduleTemplate {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const templateSchema = new Schema<IScheduleTemplate>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true, maxlength: 80 },
    description: { type: String, default: null, maxlength: 500 },
    isActive: { type: Boolean, default: false },
  },
  { timestamps: true },
);
templateSchema.index({ userId: 1, isActive: 1 });

export const ScheduleTemplate = model<IScheduleTemplate>('ScheduleTemplate', templateSchema);
