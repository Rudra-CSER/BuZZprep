import type { TrackKind } from '@buzzprep/shared';
import { Schema, model, type Types } from 'mongoose';
import { resourceSchema, type IResource } from './subdocuments';

export interface ILearningTrack {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  title: string;
  kind: TrackKind;
  description: string | null;
  color: string | null;
  resources: IResource[];
  order: number;
  archived: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const trackSchema = new Schema<ILearningTrack>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, maxlength: 80 },
    kind: {
      type: String,
      enum: ['dsa', 'system_design', 'cs_fundamentals', 'custom'],
      required: true,
    },
    description: { type: String, default: null, maxlength: 500 },
    color: { type: String, default: null },
    resources: { type: [resourceSchema], default: [] },
    order: { type: Number, default: 0 },
    archived: { type: Boolean, default: false },
  },
  { timestamps: true },
);
trackSchema.index({ userId: 1, archived: 1, order: 1 });

export const LearningTrack = model<ILearningTrack>('LearningTrack', trackSchema);
