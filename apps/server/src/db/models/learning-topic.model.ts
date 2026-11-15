import type { TopicStatus } from '@buzzprep/shared';
import { Schema, model, type Types } from 'mongoose';
import { resourceSchema, revisionSchema, type IResource, type IRevision } from './subdocuments';

export interface ILearningTopic {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  trackId: Types.ObjectId;
  title: string;
  type: 'concept' | 'practice';
  status: TopicStatus;
  order: number;
  resources: IResource[];
  notes: string | null;
  practicalImplementation: string | null;
  /** Self-rated interview confidence, 1–5. */
  confidence: number | null;
  revision: IRevision | null;
  history: { at: Date; confidence: number | null; minutes: number | null; note: string | null }[];
  startedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const topicSchema = new Schema<ILearningTopic>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    trackId: { type: Schema.Types.ObjectId, ref: 'LearningTrack', required: true },
    title: { type: String, required: true, maxlength: 160 },
    type: { type: String, enum: ['concept', 'practice'], default: 'concept' },
    status: {
      type: String,
      enum: ['not_started', 'in_progress', 'completed'],
      default: 'not_started',
    },
    order: { type: Number, default: 0 },
    resources: { type: [resourceSchema], default: [] },
    notes: { type: String, default: null, maxlength: 20_000 },
    practicalImplementation: { type: String, default: null, maxlength: 2000 },
    confidence: { type: Number, default: null, min: 1, max: 5 },
    revision: { type: revisionSchema, default: null },
    history: {
      type: [
        new Schema(
          {
            at: { type: Date, default: () => new Date() },
            confidence: { type: Number, default: null },
            minutes: { type: Number, default: null },
            note: { type: String, default: null, maxlength: 1000 },
          },
          { _id: false },
        ),
      ],
      default: [],
    },
    startedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true },
);
topicSchema.index({ userId: 1, trackId: 1, order: 1 });
topicSchema.index({ userId: 1, 'revision.dueDate': 1 });

export const LearningTopic = model<ILearningTopic>('LearningTopic', topicSchema);
