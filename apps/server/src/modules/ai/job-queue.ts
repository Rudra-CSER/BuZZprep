import type { Types } from 'mongoose';
import { AiJob, type AiJobType, type IAiJob } from '../../db/models';
import { AppError } from '../../lib/errors';
import { AiProviderError } from './providers/http';

/**
 * A small durable queue for AI work, stored in MongoDB (the same approach as the notification
 * outbox): jobs survive restarts, a worker claims one atomically with a lease, and temporary
 * provider failures are retried with backoff. Nothing runs in the browser.
 */

export const JOB_LEASE_MS = 5 * 60_000;
export const MAX_ATTEMPTS = 3;
const RETRY_DELAYS_MS = [30_000, 3 * 60_000];
const PURGE_AFTER_MS = 14 * 24 * 3600_000;

export interface EnqueueInput {
  userId: Types.ObjectId;
  type: AiJobType;
  entryId?: Types.ObjectId | null;
  clipId?: Types.ObjectId | null;
  weekStart?: string | null;
  auto?: boolean;
  force?: boolean;
}

export async function enqueueJob(input: EnqueueInput, now = new Date()): Promise<IAiJob> {
  const job = await AiJob.create({
    userId: input.userId,
    type: input.type,
    entryId: input.entryId ?? null,
    clipId: input.clipId ?? null,
    weekStart: input.weekStart ?? null,
    auto: input.auto ?? false,
    force: input.force ?? false,
    status: 'queued',
    runAfter: now,
    purgeAt: new Date(now.getTime() + PURGE_AFTER_MS),
  });
  return job.toObject() as IAiJob;
}

/** A queued or running job for the same thing already exists (avoid duplicate AI calls). */
export async function hasOpenJob(filter: {
  userId: Types.ObjectId;
  type: AiJobType;
  entryId?: Types.ObjectId;
  weekStart?: string;
}): Promise<boolean> {
  return (await AiJob.exists({ ...filter, status: { $in: ['queued', 'running'] } })) !== null;
}

/** Throws 429 when the user has started too many AI jobs in the last 24 hours. */
export async function assertWithinDailyLimit(
  userId: Types.ObjectId,
  limit: number,
  now = new Date(),
): Promise<void> {
  const since = new Date(now.getTime() - 24 * 3600_000);
  const used = await AiJob.countDocuments({ userId, createdAt: { $gte: since } });
  if (used >= limit) {
    throw new AppError(
      429,
      'rate_limited',
      `You reached today’s limit of ${limit} AI requests. It frees up over the next 24 hours.`,
    );
  }
}

/** Claim the next due job (or one whose worker died mid-way). Safe with several workers. */
export async function claimNextJob(now = new Date()): Promise<IAiJob | null> {
  return AiJob.findOneAndUpdate(
    {
      $or: [
        { status: 'queued', runAfter: { $lte: now } },
        { status: 'running', lockedUntil: { $lt: now } },
      ],
    },
    {
      $set: { status: 'running', lockedUntil: new Date(now.getTime() + JOB_LEASE_MS) },
      $inc: { attempts: 1 },
    },
    { sort: { runAfter: 1 }, returnDocument: 'after' },
  ).lean<IAiJob>();
}

export async function completeJob(id: Types.ObjectId, now = new Date()): Promise<void> {
  await AiJob.updateOne(
    { _id: id },
    { $set: { status: 'done', lockedUntil: null, finishedAt: now, error: null } },
  );
}

/** User-facing message for a failure. Internal errors are not shown verbatim. */
export function failureMessage(err: unknown): string {
  if (err instanceof AiProviderError || err instanceof AppError) return err.message.slice(0, 500);
  return 'Something went wrong while processing this. Try again later.';
}

/** Record a failure: retry later if it is temporary and attempts remain, otherwise give up. */
export async function failJob(
  job: Pick<IAiJob, '_id' | 'attempts'>,
  err: unknown,
  now = new Date(),
): Promise<'retry' | 'failed'> {
  const retryable = err instanceof AiProviderError ? err.retryable : false;
  const message = failureMessage(err);
  if (retryable && job.attempts < MAX_ATTEMPTS) {
    const delay = RETRY_DELAYS_MS[Math.min(job.attempts - 1, RETRY_DELAYS_MS.length - 1)]!;
    await AiJob.updateOne(
      { _id: job._id },
      {
        $set: {
          status: 'queued',
          lockedUntil: null,
          runAfter: new Date(now.getTime() + delay),
          error: message,
        },
      },
    );
    return 'retry';
  }
  await AiJob.updateOne(
    { _id: job._id },
    { $set: { status: 'failed', lockedUntil: null, finishedAt: now, error: message } },
  );
  return 'failed';
}

export async function deleteOpenJobsForEntry(
  userId: Types.ObjectId,
  entryId: Types.ObjectId,
): Promise<void> {
  await AiJob.deleteMany({ userId, entryId, status: { $in: ['queued', 'running'] } });
}
