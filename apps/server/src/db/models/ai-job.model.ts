import { Schema, model, type Types } from 'mongoose';

export const AI_JOB_TYPES = ['transcribe', 'notes', 'weekly_summary'] as const;
export type AiJobType = (typeof AI_JOB_TYPES)[number];
export type AiJobStatus = 'queued' | 'running' | 'done' | 'failed';

/**
 * Background AI work (transcribe a clip, write notes, summarise a week), processed by the
 * worker. Claimed atomically with a lease, so several workers can run safely; retried with
 * backoff on temporary provider errors. Rows are purged a while after they finish.
 */
export interface IAiJob {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  type: AiJobType;
  status: AiJobStatus;
  entryId: Types.ObjectId | null;
  clipId: Types.ObjectId | null;
  weekStart: string | null;
  /** Started by the weekly schedule rather than the user (sends a push when ready). */
  auto: boolean;
  /** Notes: regenerate even over notes the user edited (they asked for it). */
  force: boolean;
  attempts: number;
  runAfter: Date;
  lockedUntil: Date | null;
  error: string | null;
  finishedAt: Date | null;
  purgeAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const aiJobSchema = new Schema<IAiJob>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: AI_JOB_TYPES, required: true },
    status: {
      type: String,
      enum: ['queued', 'running', 'done', 'failed'],
      default: 'queued',
    },
    entryId: { type: Schema.Types.ObjectId, ref: 'JournalEntry', default: null },
    clipId: { type: Schema.Types.ObjectId, default: null },
    weekStart: { type: String, default: null },
    auto: { type: Boolean, default: false },
    force: { type: Boolean, default: false },
    attempts: { type: Number, default: 0 },
    runAfter: { type: Date, default: () => new Date() },
    lockedUntil: { type: Date, default: null },
    error: { type: String, default: null, maxlength: 500 },
    finishedAt: { type: Date, default: null },
    purgeAt: { type: Date, required: true },
  },
  { timestamps: true },
);
aiJobSchema.index({ status: 1, runAfter: 1 });
aiJobSchema.index({ userId: 1, createdAt: -1 });
aiJobSchema.index({ purgeAt: 1 }, { expireAfterSeconds: 0 });

export const AiJob = model<IAiJob>('AiJob', aiJobSchema);
