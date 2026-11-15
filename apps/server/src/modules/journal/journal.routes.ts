import {
  journalEntryInputSchema,
  journalExportQuerySchema,
  journalPrefsPatchSchema,
  journalRangeQuerySchema,
  journalSearchQuerySchema,
  journalTypeSchema,
} from '@buzzprep/shared';
import { Router } from 'express';
import type { AppContext } from '../../context';
import { auth, requireAuth } from '../../middleware/auth';
import { userLimiter } from '../../middleware/rate-limit';
import { badRequest } from '../../lib/errors';
import { parseDate, parseId } from '../../lib/params';
import { ensureJournalPrefs, updateJournalPrefs } from './journal-settings.service';
import {
  addClip,
  clipAudio,
  deleteEntry,
  entryView,
  exportJournal,
  findEntry,
  listEntries,
  removeClip,
  requestNotes,
  retryTranscription,
  saveEntry,
  searchEntries,
  tonightView,
} from './journal.service';
import { exportWeek, requestWeeklySummary, weekView } from './weekly.service';

/**
 * /api/v1/journal — the private journal. Every route needs a session and only ever touches
 * the signed-in user's entries.
 */
export function journalRouter(ctx: AppContext): Router {
  const r = Router();
  r.use(requireAuth);
  const { ai } = ctx;

  // ── Settings ──
  r.get('/settings', async (req, res) => {
    const { userId } = auth(req);
    const { prefs, remindersChanged } = await ensureJournalPrefs(userId);
    if (remindersChanged) ctx.notifications.queueReconcile(userId);
    res.json({ prefs, ai: { ...ai.availability, providers: ai.describe() } });
  });

  r.patch('/settings', async (req, res) => {
    const { userId } = auth(req);
    const { prefs, remindersChanged } = await updateJournalPrefs(
      userId,
      journalPrefsPatchSchema.parse(req.body),
    );
    if (remindersChanged) ctx.notifications.queueReconcile(userId);
    res.json({ prefs });
  });

  // ── Tonight ──
  r.get('/tonight', async (req, res) => {
    const { userId } = auth(req);
    const date = typeof req.query.date === 'string' ? parseDate(req.query.date) : undefined;
    const { view, remindersChanged } = await tonightView(ai, userId, date);
    if (remindersChanged) ctx.notifications.queueReconcile(userId);
    res.json(view);
  });

  // ── Entries ──
  r.get('/entries', async (req, res) => {
    const q = journalRangeQuerySchema.parse(req.query);
    res.json({ entries: await listEntries(auth(req).userId, q) });
  });

  r.get('/search', async (req, res) => {
    const { q } = journalSearchQuerySchema.parse(req.query);
    res.json({ results: await searchEntries(auth(req).userId, q) });
  });

  r.get('/export', userLimiter(10, 10 * 60_000), async (req, res) => {
    const q = journalExportQuerySchema.parse(req.query);
    const file = await exportJournal(auth(req).userId, q);
    const stamp = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Type', file.contentType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="buzzprep-journal-${stamp}.${file.ext}"`,
    );
    res.send(file.body);
  });

  r.get('/entries/:type/:date', async (req, res) => {
    const type = journalTypeSchema.parse(req.params.type);
    const entry = await findEntry(auth(req).userId, type, parseDate(req.params.date));
    res.json({ entry: entry ? entryView(entry) : null });
  });

  r.put('/entries/:type/:date', async (req, res) => {
    const type = journalTypeSchema.parse(req.params.type);
    const input = journalEntryInputSchema.parse(req.body);
    const entry = await saveEntry(ai, auth(req).userId, type, parseDate(req.params.date), input);
    res.json({ entry: entryView(entry) });
  });

  r.delete('/entries/:type/:date', async (req, res) => {
    const type = journalTypeSchema.parse(req.params.type);
    await deleteEntry(auth(req).userId, type, parseDate(req.params.date));
    res.json({ ok: true });
  });

  // ── Voice clips of the night journal (raw audio body, streamed to storage) ──
  r.post('/entries/evening/:date/clips', userLimiter(30, 60 * 60_000), async (req, res) => {
    const mimeType = req.headers['content-type'];
    if (!mimeType) throw badRequest('Send the recording with its audio Content-Type.');
    const length = Number(req.headers['content-length']);
    const duration = Number(req.query.duration ?? 0);
    const entry = await addClip(ai, auth(req).userId, parseDate(req.params.date), req, {
      mimeType,
      durationSeconds: Number.isFinite(duration) ? duration : 0,
      contentLength: Number.isFinite(length) && length > 0 ? length : null,
    });
    res.status(201).json({ entry: entryView(entry) });
  });

  r.delete('/entries/evening/:date/clips/:clipId', async (req, res) => {
    const entry = await removeClip(
      auth(req).userId,
      parseDate(req.params.date),
      parseId(req.params.clipId, 'Recording'),
    );
    res.json({ entry: entryView(entry) });
  });

  r.post(
    '/entries/evening/:date/clips/:clipId/retry',
    userLimiter(30, 60 * 60_000),
    async (req, res) => {
      const entry = await retryTranscription(
        ai,
        auth(req).userId,
        parseDate(req.params.date),
        parseId(req.params.clipId, 'Recording'),
      );
      res.status(202).json({ entry: entryView(entry) });
    },
  );

  r.get('/entries/evening/:date/clips/:clipId/audio', async (req, res) => {
    const { stream, mimeType, bytes } = await clipAudio(
      auth(req).userId,
      parseDate(req.params.date),
      parseId(req.params.clipId, 'Recording'),
    );
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Length', String(bytes));
    stream.on('error', () => res.destroy());
    stream.pipe(res);
  });

  r.post('/entries/evening/:date/notes', userLimiter(20, 60 * 60_000), async (req, res) => {
    const entry = await requestNotes(ai, auth(req).userId, parseDate(req.params.date));
    res.status(202).json({ entry: entryView(entry) });
  });

  // ── Weeks ──
  r.get('/weeks/:date', async (req, res) => {
    res.json(await weekView(ai, auth(req).userId, parseDate(req.params.date)));
  });

  r.post('/weeks/:date/summary', userLimiter(10, 60 * 60_000), async (req, res) => {
    const { userId } = auth(req);
    const weekStart = await requestWeeklySummary(ai, userId, parseDate(req.params.date));
    res.status(202).json(await weekView(ai, userId, weekStart));
  });

  r.get('/weeks/:date/export', userLimiter(10, 10 * 60_000), async (req, res) => {
    const { weekStart, markdown } = await exportWeek(auth(req).userId, parseDate(req.params.date));
    res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="buzzprep-week-${weekStart}.md"`);
    res.send(markdown);
  });

  return r;
}
