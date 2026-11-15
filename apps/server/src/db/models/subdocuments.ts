import { Schema } from 'mongoose';

/** Sub-documents shared by learning tracks, topics and problems. */
export interface IResource {
  title: string;
  url: string | null;
  type: string;
}

export const resourceSchema = new Schema<IResource>(
  {
    title: { type: String, required: true, maxlength: 120 },
    url: { type: String, default: null, maxlength: 2048 },
    type: { type: String, default: 'other' },
  },
  { _id: false },
);

export interface IRevision {
  stage: number;
  dueDate: string | null;
}

export const revisionSchema = new Schema<IRevision>(
  { stage: { type: Number, default: 0 }, dueDate: { type: String, default: null } },
  { _id: false },
);
