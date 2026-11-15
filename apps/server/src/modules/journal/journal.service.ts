import { createHash } from 'node:crypto';
import type { Readable } from 'node:stream';
import {
  diffDays,
  findNightSleep,
  JOURNAL_PROMPTS,
  journalToMarkdown,
  MAX_CLIP_BYTES,
  MAX_CLIP_SECONDS,
  MAX_CLIPS_PER_ENTRY,
  NIGHT_PROMPTS,
  nightWindow,
  notesHaveContent,
  studiedToday,
  type JournalEntryInput,
  type JournalPrefs,
  type JournalType,
  type LocalDate,
  type MarkdownEntry,
} from '@buzzprep/shared';
import { Types } from 'mongoose';
import { JournalEntry, type IJournalClip, type IJournalEntry } from '../../db/models';
import { AppError, badRequest, notFound, unavailable } from '../../lib/errors';
import { toApi } from '../../lib/serialize';
import type { AiService } from '../ai/ai.service';
import {
  assertWithinDailyLimit,
  deleteOpenJobsForEntry,
  enqueueJob,
  hasOpenJob,
} from '../ai/job-queue';
import { getProfile, notificationPrefs, todayFor } from '../profile/profile.service';
import { loadAgenda } from '../schedule/agenda.service';
import { notesSourceText } from './journal-prompts';
import { ensureJournalPrefs } from './journal-settings.service';
import { audioExtension, deleteAudio, openAudioStream, storeAudio } from './recordings.service';

/**
 * Journal entries. Private by construction: every query filters on the signed-in user's id,
 * and nothing here is reachable without a session.
 */

const MAX_RANGE_DAYS = 400;

// ── Views ─────────────────────────────────────────────────────────────────────

export function clipView(c: IJournalClip) {
  return {
    id: c._id.toHexString(),
    mimeType: c.mimeType,
    bytes: c.bytes,
    durationSeconds: c.durationSeconds,
    status: c.status,
    transcript: c.transcript,
    error: c.error,
    hasAudio: c.fileId !== null,
    createdAt: c.createdAt.toISOString(),
  };
}

export function entryView(e: IJournalEntry) {
  return {
    id: e._id.toHexString(),
    type: e.type,
    date: e.date,
    title: e.title,
    mood: e.mood,
    energy: e.energy,
    body: e.body,
    answers: e.answers,
    tags: e.tags,
    clips: (e.clips ?? []).map(clipView),
    notes: e.notes ?? null,
    notesSource: e.notesSource ?? null,
    notesStatus: e.notesStatus ?? 'idle',
    notesError: e.notesError ?? null,
    notesModel: e.notesModel ?? null,
    notesUpdatedAt: e.notesUpdatedAt?.toISOString() ?? null,
    completedAt: e.completedAt?.toISOString() ?? null,
    createdAt: e.createdAt.toISOString(),
    updatedAt: e.updatedAt.toISOString(),
  };
}

function firstLine(text: string | null | undefined, max = 160): string | null {
  const t = text?.replace(/\s+/g, ' ').trim();
  if (!t) return null;
  return t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t;
}

/** Compact form for lists, the week strip and search results. */
export function entrySummary(e: IJournalEntry) {
  const transcript = (e.clips ?? []).map((c) => c.transcript ?? '').join(' ');
  return {
    id: e._id.toHexString(),
    type: e.type,
    date: e.date,
    title: e.title,
    mood: e.mood,
    energy: e.energy,
    completed: e.completedAt !== null,
    hasNotes: notesHaveContent(e.notes),
    notesStatus: e.notesStatus ?? 'idle',
    summary: firstLine(e.notes?.summary) ?? firstLine(e.body) ?? firstLine(transcript),
    topics: (e.notes?.topics ?? []).slice(0, 4).map((t) => t.name),
    clipCount: e.clips?.length ?? 0,
  };
}

export type JournalEntryView = ReturnType<typeof entryView>;

// ── Entries ───────────────────────────────────────────────────────────────────

export async function findEntry(
  userId: Types.ObjectId,
  type: JournalType,
  date: LocalDate,
): Promise<IJournalEntry | null> {
  return JournalEntry.findOne({ userId, type, date }).lean<IJournalEntry>();
}

function questionFor(type: JournalType, key: string): string {
  if (type === 'freeform') throw badRequest('Free notes have no guided questions.');
  const prompt = JOURNAL_PROMPTS[type].find((p) => p.key === key);
  if (!prompt) throw badRequest(`Unknown question "${key}" for this entry.`);
  return prompt.question;
}

export async function saveEntry(
  ai: AiService,
  userId: Types.ObjectId,
  type: JournalType,
  date: LocalDate,
  input: JournalEntryInput,
  now = new Date(),
): Promise<IJournalEntry> {
  const set: Record<string, unknown> = {};
  if (input.title !== undefined) set.title = input.title || null;
  if (input.mood !== undefined) set.mood = input.mood ?? null;
  if (input.energy !== undefined) set.energy = input.energy ?? null;
  if (input.body !== undefined) set.body = input.body?.trim() ? input.body : null;
  if (input.tags !== undefined) set.tags = input.tags;
  if (input.answers !== undefined) {
    set.answers = input.answers.map((a) => ({
      key: a.key,
      question: questionFor(type, a.key),
      answer: a.answer,
    }));
  }
  if (input.notes !== undefined) {
    set.notes = input.notes;
    set.notesSource = input.notes ? 'manual' : null;
    set.notesStatus = input.notes ? 'ready' : 'idle';
    set.notesError = null;
    set.notesUpdatedAt = now;
  }
  const existing = await findEntry(userId, type, date);
  if (input.completed === true) set.completedAt = existing?.completedAt ?? now;
  if (input.completed === false) set.completedAt = null;

  const entry = await JournalEntry.findOneAndUpdate(
    { userId, type, date },
    {
      ...(Object.keys(set).length > 0 ? { $set: set } : {}),
      $setOnInsert: { userId, type, date },
    },
    { upsert: true, returnDocument: 'after', runValidators: true },
  ).lean<IJournalEntry>();

  // Finishing the night journal is when notes are written (or rewritten if the log changed).
  if (type === 'evening' && input.completed === true) {
    const { prefs } = await ensureJournalPrefs(userId);
    if (await maybeQueueNotes(ai, entry!, prefs)) return (await findEntry(userId, type, date))!;
  }
  return entry!;
}

export async function deleteEntry(userId: Types.ObjectId, type: JournalType, date: LocalDate) {
  const entry = await findEntry(userId, type, date);
  if (!entry) throw notFound('Journal entry');
  await deleteOpenJobsForEntry(userId, entry._id);
  for (const c of entry.clips ?? []) if (c.fileId) await deleteAudio(c.fileId);
  await JournalEntry.deleteOne({ _id: entry._id, userId });
}

export async function listEntries(
  userId: Types.ObjectId,
  q: { from: LocalDate; to: LocalDate; type?: JournalType },
) {
  if (diffDays(q.from, q.to) > MAX_RANGE_DAYS) {
    throw badRequest(`Range too large (max ${MAX_RANGE_DAYS} days).`);
  }
  const entries = await JournalEntry.find({
    userId,
    date: { $gte: q.from, $lte: q.to },
    ...(q.type ? { type: q.type } : {}),
  })
    .sort({ date: -1, type: 1 })
    .lean<IJournalEntry[]>();
  return entries.map(entrySummary);
}

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Case-insensitive search over everything written or said. Personal journals are small. */
export async function searchEntries(userId: Types.ObjectId, q: string) {
  const re = new RegExp(escapeRegex(q), 'i');
  const fields = [
    'title',
    'body',
    'answers.answer',
    'clips.transcript',
    'notes.summary',
    'notes.topics.name',
    'notes.topics.keyPoints',
    'notes.problems.name',
    'notes.mistakes',
    'notes.questions',
    'notes.reviseNext',
  ];
  const entries = await JournalEntry.find({ userId, $or: fields.map((f) => ({ [f]: re })) })
    .sort({ date: -1 })
    .limit(50)
    .lean<IJournalEntry[]>();
  return entries.map((e) => ({ ...entrySummary(e), match: matchSnippet(e, re) }));
}

function matchSnippet(e: IJournalEntry, re: RegExp): string | null {
  const texts = [
    e.notes?.summary,
    ...(e.notes?.topics ?? []).flatMap((t) => [t.name, ...t.keyPoints]),
    ...(e.notes?.problems ?? []).map((p) => p.name),
    ...(e.notes?.mistakes ?? []),
    ...(e.notes?.questions ?? []),
    ...(e.notes?.reviseNext ?? []),
    e.title,
    e.body,
    ...e.answers.map((a) => a.answer),
    ...(e.clips ?? []).map((c) => c.transcript),
  ];
  for (const t of texts) {
    if (!t) continue;
    const flat = t.replace(/\s+/g, ' ');
    const m = re.exec(flat);
    if (!m) continue;
    const start = Math.max(0, m.index - 60);
    const end = Math.min(flat.length, m.index + m[0].length + 80);
    return `${start > 0 ? '…' : ''}${flat.slice(start, end).trim()}${end < flat.length ? '…' : ''}`;
  }
  return null;
}

// ── Tonight ───────────────────────────────────────────────────────────────────

export async function tonightView(ai: AiService, userId: Types.ObjectId, requested?: LocalDate) {
  const profile = await getProfile(userId);
  const { prefs, remindersChanged } = await ensureJournalPrefs(userId);
  const today = todayFor(profile);
  const date = requested && requested <= today ? requested : today;
  const [agenda, entry] = await Promise.all([
    loadAgenda(userId, profile, date, date),
    findEntry(userId, 'evening', date),
  ]);
  const window = nightWindow(findNightSleep(agenda, date), prefs.windDownMinutes);
  return {
    view: {
      date,
      today,
      timezone: profile.timezone,
      hour12: notificationPrefs(profile).hour12,
      ...window,
      windDownMinutes: prefs.windDownMinutes,
      studied: studiedToday(agenda, date),
      prompts: NIGHT_PROMPTS,
      entry: entry ? entryView(entry) : null,
      ai: {
        voice: ai.availability.transcription && prefs.useAi,
        notes: ai.availability.notes && prefs.useAi,
        useAi: prefs.useAi,
        server: ai.availability,
      },
    },
    remindersChanged,
  };
}

// ── Voice clips ───────────────────────────────────────────────────────────────

export async function addClip(
  ai: AiService,
  userId: Types.ObjectId,
  date: LocalDate,
  source: Readable,
  meta: { mimeType: string; durationSeconds: number; contentLength: number | null },
): Promise<IJournalEntry> {
  if (!ai.transcriber) {
    throw unavailable(
      'Voice logs need a speech-to-text provider on the server. Type your log instead.',
    );
  }
  const { prefs } = await ensureJournalPrefs(userId);
  if (!prefs.useAi) {
    throw new AppError(
      409,
      'ai_off',
      'AI is turned off in your journal settings, so voice logs are off too.',
    );
  }
  if (!audioExtension(meta.mimeType)) {
    throw new AppError(415, 'unsupported_audio', 'This audio format is not supported.');
  }
  if (meta.contentLength !== null && meta.contentLength > MAX_CLIP_BYTES) {
    throw new AppError(
      413,
      'payload_too_large',
      'That recording is too large. Keep clips shorter.',
    );
  }
  const today = todayFor(await getProfile(userId));
  if (date > today) throw badRequest('You can’t journal a day that hasn’t happened yet.');
  await assertWithinDailyLimit(userId, ai.dailyLimit);

  const entry = await JournalEntry.findOneAndUpdate(
    { userId, type: 'evening', date },
    { $setOnInsert: { userId, type: 'evening', date } },
    { upsert: true, returnDocument: 'after' },
  ).lean<IJournalEntry>();
  if ((entry!.clips ?? []).length >= MAX_CLIPS_PER_ENTRY) {
    throw badRequest(`That’s the most recordings one night can have (${MAX_CLIPS_PER_ENTRY}).`);
  }

  const { fileId, bytes } = await storeAudio(
    source,
    { userId, entryId: entry!._id, mimeType: meta.mimeType },
    MAX_CLIP_BYTES,
  );
  const clipId = new Types.ObjectId();
  const clip: IJournalClip = {
    _id: clipId,
    fileId,
    mimeType: meta.mimeType.split(';')[0]!.trim().toLowerCase(),
    bytes,
    durationSeconds: Math.max(0, Math.min(MAX_CLIP_SECONDS, Math.round(meta.durationSeconds))),
    status: 'uploaded',
    transcript: null,
    error: null,
    createdAt: new Date(),
  };
  await JournalEntry.updateOne({ _id: entry!._id, userId }, { $push: { clips: clip } });
  await enqueueJob({ userId, type: 'transcribe', entryId: entry!._id, clipId });
  return (await findEntry(userId, 'evening', date))!;
}

async function findClip(userId: Types.ObjectId, date: LocalDate, clipId: Types.ObjectId) {
  const entry = await findEntry(userId, 'evening', date);
  const clip = entry?.clips.find((c) => c._id.equals(clipId));
  if (!entry || !clip) throw notFound('Recording');
  return { entry, clip };
}

export async function removeClip(userId: Types.ObjectId, date: LocalDate, clipId: Types.ObjectId) {
  const { entry, clip } = await findClip(userId, date, clipId);
  if (clip.fileId) await deleteAudio(clip.fileId);
  await JournalEntry.updateOne({ _id: entry._id, userId }, { $pull: { clips: { _id: clipId } } });
  return (await findEntry(userId, 'evening', date))!;
}

/** Transcribe a failed recording again (e.g. after fixing the API key). Its audio is kept. */
export async function retryTranscription(
  ai: AiService,
  userId: Types.ObjectId,
  date: LocalDate,
  clipId: Types.ObjectId,
) {
  if (!ai.transcriber) {
    throw unavailable('Voice logs need a speech-to-text provider on the server.');
  }
  const { prefs } = await ensureJournalPrefs(userId);
  if (!prefs.useAi) {
    throw new AppError(409, 'ai_off', 'AI is turned off in your journal settings.');
  }
  const { entry, clip } = await findClip(userId, date, clipId);
  if (clip.status !== 'failed') {
    throw new AppError(409, 'not_failed', 'This recording isn’t waiting to be tried again.');
  }
  if (!clip.fileId) {
    throw new AppError(
      410,
      'audio_gone',
      'This recording’s audio is no longer stored. Record it again.',
    );
  }
  await assertWithinDailyLimit(userId, ai.dailyLimit);
  await JournalEntry.updateOne(
    { _id: entry._id, userId, 'clips._id': clipId },
    { $set: { 'clips.$.status': 'uploaded', 'clips.$.error': null } },
  );
  await enqueueJob({ userId, type: 'transcribe', entryId: entry._id, clipId });
  return (await findEntry(userId, 'evening', date))!;
}

export async function clipAudio(userId: Types.ObjectId, date: LocalDate, clipId: Types.ObjectId) {
  const { clip } = await findClip(userId, date, clipId);
  if (!clip.fileId) throw notFound('Recording audio');
  return { stream: openAudioStream(clip.fileId), mimeType: clip.mimeType, bytes: clip.bytes };
}

// ── Notes ─────────────────────────────────────────────────────────────────────

export function logOf(e: Pick<IJournalEntry, 'body' | 'clips'>) {
  const transcripts = (e.clips ?? [])
    .filter((c) => c.status === 'transcribed' && c.transcript)
    .map((c) => c.transcript!);
  return { typedLog: e.body, transcripts, text: notesSourceText(e.body, transcripts) };
}

export const hashLog = (text: string) => createHash('sha256').update(text).digest('hex');

/**
 * Queue notes for a night entry when it makes sense: AI is on, there is a log, no recording is
 * still being transcribed, the user hasn't written their own notes, and the log changed since
 * the current notes were written. `force` (the user asked) skips the last two checks.
 */
export async function maybeQueueNotes(
  ai: AiService,
  entry: IJournalEntry,
  prefs: JournalPrefs,
  { force = false } = {},
): Promise<boolean> {
  if (!ai.writer || !prefs.useAi || entry.type !== 'evening') return false;
  const { text } = logOf(entry);
  if (!text) return false;
  if ((entry.clips ?? []).some((c) => c.status === 'uploaded' || c.status === 'transcribing')) {
    return false;
  }
  if (!force && entry.notesSource === 'manual') return false;
  if (!force && entry.notesInputHash === hashLog(text) && entry.notesStatus === 'ready')
    return false;
  if (await hasOpenJob({ userId: entry.userId, type: 'notes', entryId: entry._id })) return false;
  try {
    await assertWithinDailyLimit(entry.userId, ai.dailyLimit);
  } catch (err) {
    if (force) throw err;
    await JournalEntry.updateOne(
      { _id: entry._id },
      { $set: { notesStatus: 'failed', notesError: (err as Error).message } },
    );
    return false;
  }
  await JournalEntry.updateOne(
    { _id: entry._id },
    { $set: { notesStatus: 'queued', notesError: null } },
  );
  await enqueueJob({ userId: entry.userId, type: 'notes', entryId: entry._id, force });
  return true;
}

/** "Write notes again" from the entry page. */
export async function requestNotes(ai: AiService, userId: Types.ObjectId, date: LocalDate) {
  if (!ai.writer) throw unavailable('Notes need an AI provider on the server.');
  const { prefs } = await ensureJournalPrefs(userId);
  if (!prefs.useAi) {
    throw new AppError(409, 'ai_off', 'AI is turned off in your journal settings.');
  }
  const entry = await findEntry(userId, 'evening', date);
  if (!entry || !logOf(entry).text) {
    throw badRequest('There is no log to write notes from yet. Record or type one first.');
  }
  if ((entry.clips ?? []).some((c) => c.status === 'uploaded' || c.status === 'transcribing')) {
    throw new AppError(
      409,
      'busy',
      'A recording is still being transcribed. Notes follow automatically.',
    );
  }
  await maybeQueueNotes(ai, entry, prefs, { force: true });
  return (await findEntry(userId, 'evening', date))!;
}

// ── Export ────────────────────────────────────────────────────────────────────

export function toMarkdownEntry(e: IJournalEntry): MarkdownEntry {
  return {
    type: e.type,
    date: e.date,
    title: e.title,
    mood: e.mood,
    energy: e.energy,
    body: e.body,
    answers: e.answers,
    notes: e.notes ?? null,
    transcript: logOf(e).transcripts.join('\n\n') || null,
  };
}

export async function exportJournal(
  userId: Types.ObjectId,
  q: { format: 'markdown' | 'json'; from?: LocalDate; to?: LocalDate },
) {
  const range: Record<string, string> = {};
  if (q.from) range.$gte = q.from;
  if (q.to) range.$lte = q.to;
  const entries = await JournalEntry.find({
    userId,
    ...(q.from || q.to ? { date: range } : {}),
  })
    .sort({ date: 1, type: 1 })
    .limit(5000)
    .lean<IJournalEntry[]>();
  if (q.format === 'markdown') {
    return {
      contentType: 'text/markdown; charset=utf-8',
      ext: 'md',
      body: journalToMarkdown(entries.map(toMarkdownEntry)),
    };
  }
  const data = {
    format: 'buzzprep.journal-export',
    version: 1,
    exportedAt: new Date().toISOString(),
    entries: entries.map((e) => toApi(entryView(e), [])),
  };
  return {
    contentType: 'application/json; charset=utf-8',
    ext: 'json',
    body: JSON.stringify(data, null, 2),
  };
}
