import type { GoalType } from '@buzzprep/shared';
import { Schema, model, type Types } from 'mongoose';

export interface IMilestone {
  _id: Types.ObjectId;
  title: string;
  dueDate: string;
  completed: boolean;
  completedAt: Date | null;
  note: string | null;
}

export interface IPlan {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  title: string;
  goalType: GoalType;
  targetRole: string | null;
  targetCompanies: string[];
  stretchCompanies: string[];
  compensationTarget: string | null;
  description: string | null;
  startDate: string;
  deadline: string;
  status: 'active' | 'paused' | 'completed' | 'archived';
  milestones: Types.DocumentArray<IMilestone>;
  sourceTemplate: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const milestoneSchema = new Schema<IMilestone>({
  title: { type: String, required: true, maxlength: 160 },
  dueDate: { type: String, required: true },
  completed: { type: Boolean, default: false },
  completedAt: { type: Date, default: null },
  note: { type: String, default: null, maxlength: 500 },
});

const planSchema = new Schema<IPlan>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, maxlength: 120 },
    goalType: { type: String, default: 'custom' },
    targetRole: { type: String, default: null },
    targetCompanies: { type: [String], default: [] },
    stretchCompanies: { type: [String], default: [] },
    compensationTarget: { type: String, default: null },
    description: { type: String, default: null },
    startDate: { type: String, required: true },
    deadline: { type: String, required: true },
    status: {
      type: String,
      enum: ['active', 'paused', 'completed', 'archived'],
      default: 'active',
    },
    milestones: { type: [milestoneSchema], default: [] },
    sourceTemplate: { type: String, default: null },
  },
  { timestamps: true },
);
planSchema.index({ userId: 1, status: 1 });

export const Plan = model<IPlan>('Plan', planSchema);
