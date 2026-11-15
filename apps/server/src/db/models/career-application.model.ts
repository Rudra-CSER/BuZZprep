import type { ApplicationStage } from '@buzzprep/shared';
import { Schema, model, type Types } from 'mongoose';

export interface IInterview {
  _id: Types.ObjectId;
  round: string;
  type: string | null;
  scheduledAt: Date | null;
  status: 'scheduled' | 'done' | 'cancelled';
  questions: { question: string; category: string | null; notes: string | null }[];
  feedback: string | null;
  lessonsLearned: string | null;
  rating: number | null;
}

export interface ICareerApplication {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  company: string;
  role: string | null;
  location: string | null;
  jobUrl: string | null;
  stage: ApplicationStage;
  tier: 'dream' | 'target' | 'safe' | null;
  targetSalary: string | null;
  applicationDeadline: string | null;
  appliedAt: string | null;
  referral: {
    name: string | null;
    contact: string | null;
    status: string | null;
    notes: string | null;
  } | null;
  contacts: { name: string; role: string | null; contact: string | null; notes: string | null }[];
  interviews: Types.DocumentArray<IInterview>;
  notes: string | null;
  stageHistory: { stage: ApplicationStage; at: Date }[];
  archived: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const interviewSchema = new Schema<IInterview>({
  round: { type: String, required: true, maxlength: 80 },
  type: { type: String, default: null, maxlength: 60 },
  scheduledAt: { type: Date, default: null },
  status: { type: String, enum: ['scheduled', 'done', 'cancelled'], default: 'scheduled' },
  questions: {
    type: [
      new Schema(
        {
          question: { type: String, required: true, maxlength: 2000 },
          category: { type: String, default: null, maxlength: 60 },
          notes: { type: String, default: null, maxlength: 5000 },
        },
        { _id: false },
      ),
    ],
    default: [],
  },
  feedback: { type: String, default: null, maxlength: 5000 },
  lessonsLearned: { type: String, default: null, maxlength: 5000 },
  rating: { type: Number, default: null, min: 1, max: 5 },
});

const applicationSchema = new Schema<ICareerApplication>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    company: { type: String, required: true, maxlength: 80 },
    role: { type: String, default: null, maxlength: 120 },
    location: { type: String, default: null, maxlength: 120 },
    jobUrl: { type: String, default: null, maxlength: 2048 },
    stage: { type: String, default: 'interested' },
    tier: { type: String, enum: ['dream', 'target', 'safe', null], default: null },
    targetSalary: { type: String, default: null, maxlength: 60 },
    applicationDeadline: { type: String, default: null },
    appliedAt: { type: String, default: null },
    referral: { type: Schema.Types.Mixed, default: null },
    contacts: {
      type: [
        new Schema(
          {
            name: { type: String, required: true, maxlength: 80 },
            role: { type: String, default: null, maxlength: 80 },
            contact: { type: String, default: null, maxlength: 200 },
            notes: { type: String, default: null, maxlength: 1000 },
          },
          { _id: false },
        ),
      ],
      default: [],
    },
    interviews: { type: [interviewSchema], default: [] },
    notes: { type: String, default: null, maxlength: 10_000 },
    stageHistory: {
      type: [new Schema({ stage: String, at: Date }, { _id: false })],
      default: [],
    },
    archived: { type: Boolean, default: false },
  },
  { timestamps: true },
);
applicationSchema.index({ userId: 1, stage: 1 });
applicationSchema.index({ userId: 1, company: 1 });

export const CareerApplication = model<ICareerApplication>('CareerApplication', applicationSchema);
