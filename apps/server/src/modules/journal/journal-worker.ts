import type { Env } from '../../config/env';
import { logger } from '../../lib/logger';
import type { AiService } from '../ai/ai.service';
import { claimNextJob, completeJob, failJob, failureMessage, MAX_ATTEMPTS } from '../ai/job-queue';
import { AiProviderError } from '../ai/providers/http';
import { journalJobFailed, queueDueWeeklySummaries, runJournalJob } from './journal-jobs';

const TICK_MS = 3_000;
const JOBS_PER_TICK = 5;
const WEEKLY_CHECK_MS = 10 * 60_000;

/** Claim and run one due job. Returns false when there was nothing to do. */
export async function processNextJob(ai: AiService, now = new Date()): Promise<boolean> {
  const job = await claimNextJob(now);
  if (!job) return false;
  if (job.attempts > MAX_ATTEMPTS) {
    // Its worker died repeatedly mid-job (the lease expired each time): stop retrying.
    const message = 'This took too long and was stopped. Try again.';
    await failJob(job, new AiProviderError(message, null, false));
    await journalJobFailed(job, message, true, ai).catch(() => undefined);
    return true;
  }
  try {
    await runJournalJob(job, ai);
    await completeJob(job._id);
  } catch (err) {
    const outcome = await failJob(job, err);
    if (outcome === 'failed') {
      logger.warn({ err, jobId: job._id, type: job.type }, 'Journal AI job failed');
    }
    await journalJobFailed(job, failureMessage(err), outcome === 'failed', ai).catch((e) =>
      logger.error({ err: e, jobId: job._id }, 'Could not record a job failure'),
    );
  }
  return true;
}

/**
 * Background loop for journal AI work, in the worker process (never the browser): claim queued
 * jobs and run them one at a time, and queue scheduled weekly summaries. Each step is guarded
 * against overlap; claims are atomic, so several workers are safe.
 */
export function startJournalWorker(ai: AiService, _env: Env): () => void {
  let busy = false;
  let scheduling = false;

  const tick = async () => {
    if (busy) return;
    busy = true;
    try {
      for (let i = 0; i < JOBS_PER_TICK; i++) {
        if (!(await processNextJob(ai))) break;
      }
    } catch (err) {
      logger.error({ err }, 'Journal worker tick failed');
    } finally {
      busy = false;
    }
  };

  const schedule = async () => {
    if (scheduling) return;
    scheduling = true;
    try {
      const n = await queueDueWeeklySummaries(ai);
      if (n > 0) logger.info({ queued: n }, 'Queued scheduled weekly summaries');
    } catch (err) {
      logger.error({ err }, 'Weekly summary scheduling failed');
    } finally {
      scheduling = false;
    }
  };

  const jobTimer = setInterval(tick, TICK_MS);
  const weeklyTimer = setInterval(schedule, WEEKLY_CHECK_MS);
  void tick();
  void schedule();
  return () => {
    clearInterval(jobTimer);
    clearInterval(weeklyTimer);
  };
}
