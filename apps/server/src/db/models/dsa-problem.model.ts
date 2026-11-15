import type { Difficulty, Platform, ProblemOutcome } from '@buzzprep/shared';
import { Schema, model, type Types } from 'mongoose';
import { revisionSchema, type IRevision } from './subdocuments';

export interface IProblemAttempt {
  _id: Types.ObjectId;
  at: Date;
  date: string;
  outcome: ProblemOutcome;
  minutes: number | null;
  isRevision: boolean;
  notes: string | null;
}

export interface IDSAProblem {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  trackId: Types.ObjectId | null;
  topicId: Types.ObjectId | null;
  title: string;
  platform: Platform;
  url: string | null;
  difficulty: Difficulty;
  tags: string[];
  /** Classification uses the first attempt — see shared/progress.ts. */
  firstOutcome: ProblemOutcome | null;
  bestOutcome: ProblemOutcome | null;
  latestOutcome: ProblemOutcome | null;
  attempts: Types.DocumentArray<IProblemAttempt>;
  notes: string | null;
  approach: string | null;
  code: string | null;
  timeComplexity: string | null;
  spaceComplexity: string | null;
  revision: IRevision | null;
  createdAt: Date;
  updatedAt: Date;
}

const attemptSchema = new Schema<IProblemAttempt>({
  at: { type: Date, default: () => new Date() },
  date: { type: String, required: true },
  outcome: {
    type: String,
    enum: ['independent', 'hints', 'editorial', 'unsolved'],
    required: true,
  },
  minutes: { type: Number, default: null },
  isRevision: { type: Boolean, default: false },
  notes: { type: String, default: null, maxlength: 2000 },
});

const problemSchema = new Schema<IDSAProblem>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    trackId: { type: Schema.Types.ObjectId, ref: 'LearningTrack', default: null },
    topicId: { type: Schema.Types.ObjectId, ref: 'LearningTopic', default: null },
    title: { type: String, required: true, maxlength: 200 },
    platform: { type: String, default: 'other' },
    url: { type: String, default: null, maxlength: 2048 },
    difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'easy' },
    tags: { type: [String], default: [] },
    firstOutcome: { type: String, default: null },
    bestOutcome: { type: String, default: null },
    latestOutcome: { type: String, default: null },
    attempts: { type: [attemptSchema], default: [] },
    notes: { type: String, default: null, maxlength: 20_000 },
    approach: { type: String, default: null, maxlength: 5000 },
    code: { type: String, default: null, maxlength: 50_000 },
    timeComplexity: { type: String, default: null, maxlength: 60 },
    spaceComplexity: { type: String, default: null, maxlength: 60 },
    revision: { type: revisionSchema, default: null },
  },
  { timestamps: true },
);
problemSchema.index({ userId: 1, createdAt: -1 });
problemSchema.index({ userId: 1, 'revision.dueDate': 1 });
problemSchema.index({ userId: 1, topicId: 1 });
problemSchema.index(
  { userId: 1, url: 1 },
  { unique: true, partialFilterExpression: { url: { $type: 'string' } } },
);

export const DSAProblem = model<IDSAProblem>('DSAProblem', problemSchema);
