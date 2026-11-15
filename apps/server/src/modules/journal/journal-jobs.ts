import {
  addDays,
  isWithinDailyRange,
  journalWeekUrl,
  localTimeOf,
  logicalDateOf,
  logicalDateTime,
  normalizeNotes,
  normalizeWeeklySummary,
  resolveJournalPrefs,
  studiedToday,
  type LocalDate,
} from '@buzzprep/shared';
import type { Types } from 'mongoose';
import {
  JournalEntry,
  Notification,
  UserProfile,
  WeeklyReview,
  type IAiJob,
  type IJournalEntry,
  type IUserProfile,
  type IWeeklyReview,
} from '../../db/models';
import { logger } from '../../lib/logger';
import type { AiService } from '../ai/ai.service';
import { AiProviderError } from '../ai/providers/http';
import { PURGE_AFTER_MS } from '../notifications/delivery-policy';
import { getProfile, notificationPrefs, timeContext } from '../profile/profile.service';
import { loadAgenda } from '../schedule/agenda.service';
import {
  buildNotesPrompt,
  buildWeeklyPrompt,
  NOTES_SCHEMA,
  NOTES_SYSTEM,
  transcriptionHint,
  WEEKLY_SCHEMA,
  WEEKLY_SYSTEM,
} from './journal-prompts';
import { ensureJournalPrefs } from './journal-settings.service';
import { hashLog, logOf, maybeQueueNotes } from './journal.service';
import { deleteAudio, readAudio, audioExtension } from './recordings.service';
import { compileUserWeek, requestWeeklySummary, weekStartFor } from './weekly.service';

/** What the worker does with each kind of AI job, and what users see when one fails. */

const notConfigured = (what: string) =>
  new AiProviderError(`${what} is not configured on this server any more.`, null, false);

export async function runJournalJob(job: IAiJob, ai: AiService): Promise<void> {
  switch (job.type) {
    case 'transcribe':
      return transcribeClip(job, ai);
    case 'notes':
      return writeNotes(job, ai);
    case 'weekly_summary':
      return writeWeeklySummary(job, ai);
  }
}

/** Reflect a failure on the entry, clip or week so the app can show it. */
export async function journalJobFailed(
  job: IAiJob,
  message: string,
  final: boolean,
  ai: AiService,
) {
  if (job.type === 'transcribe' && job.entryId && job.clipId) {
    await JournalEntry.updateOne(
      { _id: job.entryId, userId: job.userId, 'clips._id': job.clipId },
      {
        $set: final
          ? { 'clips.$.status': 'failed', 'clips.$.error': message }
          : { 'clips.$.status': 'uploaded', 'clips.$.error': null },
      },
    );
    if (final) {
      // Other recordings may be done: notes can still be written from them.
      const entry = await JournalEntry.findById(job.entryId).lean<IJournalEntry>();
      if (entry) await queueNotesAfterTranscription(entry, job.userId, ai);
    }
  } else if (job.type === 'notes' && job.entryId) {
    await JournalEntry.updateOne(
      { _id: job.entryId, userId: job.userId },
      { $set: final ? { notesStatus: 'failed', notesError: message } : { notesStatus: 'queued' } },
    );
  } else if (job.type === 'weekly_summary' && job.weekStart) {
    await WeeklyReview.updateOne(
      { userId: job.userId, weekStart: job.weekStart },
      {
        $set: final
          ? { summaryStatus: 'failed', summaryError: message }
          : { summaryStatus: 'queued' },
      },
    );
  }
}

// ── Transcription ─────────────────────────────────────────────────────────────

async function transcribeClip(job: IAiJob, ai: AiService) {
  if (!ai.transcriber) throw notConfigured('Speech-to-text');
  const entry = await JournalEntry.findOne({
    _id: job.entryId,
    userId: job.userId,
  }).lean<IJournalEntry>();
  const clip = entry?.clips.find((c) => job.clipId && c._id.equals(job.clipId));
  if (!entry || !clip || clip.status === 'transcribed') return; // deleted meanwhile, or done
  if (!clip.fileId) {
    throw new AiProviderError('The recording’s audio is no longer stored.', null, false);
  }
  await JournalEntry.updateOne(
    { _id: entry._id, 'clips._id': clip._id },
    { $set: { 'clips.$.status': 'transcribing', 'clips.$.error': null } },
  );

  const profile = await getProfile(job.userId);
  const agenda = await loadAgenda(job.userId, profile, entry.date, entry.date);
  const audio = await readAudio(clip.fileId);
  const text = await ai.transcriber.transcribe({
    audio,
    mimeType: clip.mimeType,
    filename: `journal.${audioExtension(clip.mimeType) ?? 'webm'}`,
    prompt: transcriptionHint(studiedToday(agenda, entry.date)),
  });

  const { prefs } = await ensureJournalPrefs(job.userId);
  const keep = prefs.keepAudio;
  const updated = await JournalEntry.findOneAndUpdate(
    { _id: entry._id, 'clips._id': clip._id },
    {
      $set: {
        'clips.$.status': 'transcribed',
        'clips.$.transcript': text || '',
        'clips.$.error': text ? null : 'No speech was recognised in this recording.',
        ...(keep ? {} : { 'clips.$.fileId': null }),
      },
    },
    { returnDocument: 'after' },
  ).lean<IJournalEntry>();
  if (!keep) await deleteAudio(clip.fileId);
  if (updated) await queueNotesAfterTranscription(updated, job.userId, ai);
}

async function queueNotesAfterTranscription(
  entry: IJournalEntry,
  userId: Types.ObjectId,
  ai: AiService,
) {
  const { prefs } = await ensureJournalPrefs(userId);
  await maybeQueueNotes(ai, entry, prefs);
}

// ── Notes ─────────────────────────────────────────────────────────────────────

async function writeNotes(job: IAiJob, ai: AiService) {
  if (!ai.writer) throw notConfigured('The notes model');
  const entry = await JournalEntry.findOne({
    _id: job.entryId,
    userId: job.userId,
  }).lean<IJournalEntry>();
  if (!entry) return;
  if (entry.notesSource === 'manual' && !job.force) {
    // The user wrote their own notes after this was queued: theirs win.
    await JournalEntry.updateOne({ _id: entry._id }, { $set: { notesStatus: 'ready' } });
    return;
  }
  const log = logOf(entry);
  if (!log.text) {
    await JournalEntry.updateOne({ _id: entry._id }, { $set: { notesStatus: 'idle' } });
    return;
  }
  await JournalEntry.updateOne({ _id: entry._id }, { $set: { notesStatus: 'running' } });

  const profile = await getProfile(job.userId);
  const agenda = await loadAgenda(job.userId, profile, entry.date, entry.date);
  const raw = await ai.writer.generateJson({
    system: NOTES_SYSTEM,
    user: buildNotesPrompt({
      date: entry.date,
      mood: entry.mood,
      energy: entry.energy,
      studied: studiedToday(agenda, entry.date),
      typedLog: log.typedLog,
      transcripts: log.transcripts,
      closing: entry.answers,
    }),
    schemaName: 'journal_notes',
    schema: NOTES_SCHEMA,
    maxTokens: 4096,
  });
  const notes = normalizeNotes(raw);
  await JournalEntry.updateOne(
    // Don't overwrite notes the user wrote while the model was working.
    { _id: entry._id, ...(job.force ? {} : { notesSource: { $ne: 'manual' } }) },
    {
      $set: {
        notes,
        notesSource: 'ai',
        notesStatus: 'ready',
        notesError: null,
        notesModel: ai.writer.model,
        notesUpdatedAt: new Date(),
        notesInputHash: hashLog(log.text),
      },
    },
  );
}

// ── Weekly summary ────────────────────────────────────────────────────────────

async function writeWeeklySummary(job: IAiJob, ai: AiService) {
  if (!ai.writer || !job.weekStart) throw notConfigured('The notes model');
  const profile = await getProfile(job.userId);
  const { weekStart, weekEnd, week, sessions } = await compileUserWeek(
    job.userId,
    profile,
    job.weekStart,
  );
  await WeeklyReview.updateOne(
    { userId: job.userId, weekStart },
    { $set: { summaryStatus: 'running' }, $setOnInsert: { userId: job.userId, weekStart } },
    { upsert: true },
  );
  const raw = await ai.writer.generateJson({
    system: WEEKLY_SYSTEM,
    user: buildWeeklyPrompt({ weekStart, weekEnd, week, sessions }),
    schemaName: 'weekly_summary',
    schema: WEEKLY_SCHEMA,
    maxTokens: 4096,
  });
  await WeeklyReview.updateOne(
    { userId: job.userId, weekStart },
    {
      $set: {
        summary: normalizeWeeklySummary(raw),
        summaryStatus: 'ready',
        summaryError: null,
        summaryModel: ai.writer.model,
        summaryGeneratedAt: new Date(),
        stats: { nights: week.nights, ...sessions },
      },
    },
  );
  if (job.auto) await notifyWeeklySummaryReady(job.userId, weekStart);
}

/** One push when a scheduled summary is ready, respecting the user's notification settings. */
async function notifyWeeklySummaryReady(userId: Types.ObjectId, weekStart: LocalDate) {
  const profile = await getProfile(userId);
  const prefs = notificationPrefs(profile);
  const now = new Date();
  if (!prefs.enabled || prefs.kinds.weekly_review === false) return;
  const qh = prefs.quietHours;
  if (qh.enabled && isWithinDailyRange(localTimeOf(now, profile.timezone), qh.start, qh.end))
    return;
  await Notification.updateOne(
    { userId, dedupeKey: `journal:weekly:${weekStart}` },
    {
      $setOnInsert: {
        userId,
        source: 'journal',
        dedupeKey: `journal:weekly:${weekStart}`,
        reminderId: null,
        kind: 'weekly_review',
        activityId: null,
        occurrenceDate: null,
        fireAt: now,
        title: 'Your week, summarised',
        body: 'Topics, weak spots and a revision plan for the weekend.',
        url: journalWeekUrl(weekStart),
        tag: `weekly:${weekStart}`,
        condition: null,
        urgency: 'normal',
        ttlSeconds: 6 * 3600,
        maxLatenessSeconds: 6 * 3600,
        status: 'pending',
        attempts: 0,
        results: [],
        purgeAt: new Date(now.getTime() + PURGE_AFTER_MS),
      },
    },
    { upsert: true },
  );
}

/**
 * Queue scheduled weekly summaries that are due: at the user's chosen weekday and time (their
 * timezone), for the week that day belongs to — or, on the first day of a week, the week that
 * just ended. Runs in the worker every few minutes; queues each week at most once.
 */
export async function queueDueWeeklySummaries(ai: AiService, now = new Date()): Promise<number> {
  if (!ai.writer) return 0;
  const profiles = await UserProfile.find({
    'journal.weeklySummary.auto': true,
    onboardingCompletedAt: { $ne: null },
  }).lean<IUserProfile[]>();
  let queued = 0;
  for (const profile of profiles) {
    try {
      const prefs = resolveJournalPrefs(profile.journal);
      if (!prefs.useAi || !prefs.weeklySummary.auto) continue;
      const ctx = timeContext(profile);
      const today = logicalDateOf(now, ctx);
      const thisWeek = weekStartFor(profile, today);
      const offset = (prefs.weeklySummary.weekday - (profile.weekStartsOn ?? 1) + 7) % 7;
      const day = addDays(thisWeek, offset);
      const due = logicalDateTime(day, prefs.weeklySummary.time, ctx).toMillis();
      if (now.getTime() < due || now.getTime() - due > 36 * 3600_000) continue;
      const target = offset === 0 ? addDays(thisWeek, -7) : thisWeek;
      const review = await WeeklyReview.findOne({
        userId: profile.userId,
        weekStart: target,
      }).lean<IWeeklyReview>();
      const handled =
        review &&
        (review.summaryStatus === 'queued' ||
          review.summaryStatus === 'running' ||
          (review.summaryGeneratedAt && review.summaryGeneratedAt.getTime() >= due) ||
          (review.summaryStatus === 'failed' && review.updatedAt.getTime() >= due));
      if (handled) continue;
      await requestWeeklySummary(ai, profile.userId, target, { auto: true });
      queued++;
    } catch (err) {
      // "No entries this week" and similar are expected; log others.
      if (!(err as { status?: number }).status) {
        logger.error({ err, userId: profile.userId }, 'Scheduling the weekly summary failed');
      }
    }
  }
  return queued;
}
