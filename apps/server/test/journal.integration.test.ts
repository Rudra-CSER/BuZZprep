import { defaultAnswers, logicalDateOf, type TimeContext } from '@buzzprep/shared';
import mongoose from 'mongoose';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { ensureIndexes } from '../src/db/connection';
import {
  Activity,
  AiJob,
  JournalEntry,
  Notification,
  Reminder,
  type IActivity,
  type IReminder,
} from '../src/db/models';
import { AiService } from '../src/modules/ai/ai.service';
import { AiProviderError } from '../src/modules/ai/providers/http';
import { processNextJob } from '../src/modules/journal/journal-worker';
import {
  CLIENT_HEADERS as H,
  FakePushSender,
  FakeTranscriber,
  FakeWriter,
  ManualNotificationService,
  testEnv,
} from './helpers';

/**
 * The night journal end to end against a real MongoDB, with fake AI providers.
 * Run with:  MONGODB_TEST_URI=mongodb://127.0.0.1:27017/buzzprep_test npm test -w @buzzprep/server
 * Skipped when the variable is unset.
 */
const MONGO = process.env.MONGODB_TEST_URI;
const IST: TimeContext = { zone: 'Asia/Kolkata', dayBoundaryMinutes: 240 };
const PASSWORD = 'correct horse battery';

describe.skipIf(!MONGO)('Journal integration (MongoDB)', () => {
  const env = testEnv();
  const service = new ManualNotificationService(env, new FakePushSender());
  const transcriber = new FakeTranscriber();
  const writer = new FakeWriter();
  const ai = new AiService(transcriber, writer, 100);
  const app = createApp({ env, notifications: service, ai });
  const jo = request.agent(app);
  const eve = request.agent(app);
  const today = logicalDateOf(Date.now(), IST);
  const entryUrl = `/api/v1/journal/entries/evening/${today}`;
  let joId = '';

  const drainJobs = async () => {
    for (let i = 0; i < 20 && (await processNextJob(ai)); i++);
  };
  const audioFiles = () =>
    mongoose.connection.db!.collection('journal_audio.files').countDocuments();

  beforeAll(async () => {
    await mongoose.connect(MONGO!);
    await mongoose.connection.dropDatabase();
    await ensureIndexes();
  });

  afterAll(async () => {
    service.stop();
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });

  it('sets up an account with a generated schedule', async () => {
    const reg = await jo.post('/api/v1/auth/register').set(H).send({
      email: 'jo@example.com',
      password: PASSWORD,
      displayName: 'Jo',
      timezone: 'Asia/Kolkata',
    });
    expect(reg.status).toBe(201);
    joId = reg.body.user.id;
    const answers = defaultAnswers('sde_interview', { timezone: 'Asia/Kolkata', today });
    const done = await jo.post('/api/v1/onboarding/complete').set(H).send({ answers });
    expect(done.status).toBe(200);
  });

  it('keeps one night reminder, minutes before bed, and follows the settings', async () => {
    const settings = await jo.get('/api/v1/journal/settings');
    expect(settings.status).toBe(200);
    expect(settings.body.prefs).toMatchObject({
      windDownMinutes: 10,
      useAi: true,
      keepAudio: false,
    });
    expect(settings.body.ai).toMatchObject({ transcription: true, notes: true });

    const sleep = await Activity.findOne({
      userId: joId,
      category: 'sleep',
      durationMinutes: { $gte: 180 },
    }).lean<IActivity>();
    const enabled = async () =>
      Reminder.find({ userId: joId, kind: 'journal', enabled: true }).lean<IReminder[]>();
    expect(await enabled()).toHaveLength(1);
    expect((await enabled())[0]).toMatchObject({ activityId: sleep!._id, offsetMinutes: -10 });

    const patched = await jo.patch('/api/v1/journal/settings').set(H).send({ windDownMinutes: 5 });
    expect(patched.body.prefs.windDownMinutes).toBe(5);
    expect((await enabled())[0]).toMatchObject({ offsetMinutes: -5, title: null, body: null });
    expect(service.queued.has(joId)).toBe(true);
  });

  it('opens tonight with bedtime, the window and today’s sessions', async () => {
    const res = await jo.get('/api/v1/journal/tonight');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ date: today, windDownMinutes: 5, entry: null });
    expect(Date.parse(res.body.bedtime) - Date.parse(res.body.opensAt)).toBe(5 * 60_000);
    expect(res.body.prompts.map((p: { key: string }) => p.key)).toEqual(['unfinished', 'tomorrow']);
    expect(res.body.ai).toMatchObject({ voice: true, notes: true, useAi: true });
    expect(res.body.timezone).toBe('Asia/Kolkata');
  });

  it('saves a typed log and writes notes when the night is finished', async () => {
    const saved = await jo
      .put(entryUrl)
      .set(H)
      .send({
        mood: 'good',
        energy: 4,
        body: 'BFS on grids. Rotting oranges, needed a hint.',
        answers: [{ key: 'tomorrow', answer: 'Dijkstra' }],
      });
    expect(saved.status).toBe(200);
    expect(saved.body.entry).toMatchObject({
      mood: 'good',
      notesStatus: 'idle',
      completedAt: null,
    });
    expect(saved.body.entry.answers).toEqual([
      { key: 'tomorrow', question: 'First thing tomorrow?', answer: 'Dijkstra' },
    ]);
    const bad = await jo
      .put(entryUrl)
      .set(H)
      .send({ answers: [{ key: 'nope', answer: 'x' }] });
    expect(bad.status).toBe(400);

    const done = await jo.put(entryUrl).set(H).send({ completed: true });
    expect(done.body.entry.notesStatus).toBe('queued');
    await drainJobs();
    const entry = (await jo.get(entryUrl)).body.entry;
    expect(entry).toMatchObject({
      notesStatus: 'ready',
      notesSource: 'ai',
      notesModel: 'fake-writer',
    });
    expect(entry.notes.topics[0].name).toBe('BFS');
    expect(writer.calls[0]!.user).toContain('<log>\nBFS on grids.');

    // Finishing again with an unchanged log does not call the model again.
    await jo.put(entryUrl).set(H).send({ completed: true });
    await drainJobs();
    expect(writer.calls).toHaveLength(1);
  });

  it('transcribes a voice clip, deletes the audio, and rewrites the notes', async () => {
    const res = await jo
      .post(`${entryUrl}/clips?duration=42`)
      .set(H)
      .set('Content-Type', 'audio/mp4')
      .send(Buffer.from('not really audio, but bytes'));
    expect(res.status).toBe(201);
    expect(res.body.entry.clips[0]).toMatchObject({
      status: 'uploaded',
      durationSeconds: 42,
      hasAudio: true,
      mimeType: 'audio/mp4',
    });
    expect(await audioFiles()).toBe(1);

    await drainJobs();
    const entry = (await jo.get(entryUrl)).body.entry;
    expect(entry.clips[0]).toMatchObject({
      status: 'transcribed',
      transcript: 'Spoken: Dijkstra with a min-heap.',
      hasAudio: false,
    });
    expect(transcriber.calls[0]).toMatchObject({ mimeType: 'audio/mp4', filename: 'journal.mp4' });
    expect(await audioFiles()).toBe(0);
    // The log changed, so the notes were written again from both parts.
    expect(writer.calls).toHaveLength(2);
    expect(writer.calls[1]!.user).toContain('<transcript>\nSpoken: Dijkstra with a min-heap.');
  });

  it('keeps a failed recording so it can be tried again', async () => {
    transcriber.failWith = new AiProviderError(
      'Groq rejected the API key. Check GROQ_API_KEY in the server’s .env file.',
      401,
      false,
    );
    const up = await jo
      .post(`${entryUrl}/clips?duration=12`)
      .set(H)
      .set('Content-Type', 'audio/webm')
      .send(Buffer.from('more audio'));
    expect(up.status).toBe(201);
    const clipId = up.body.entry.clips.at(-1).id;
    await drainJobs();
    const failed = (await jo.get(entryUrl)).body.entry.clips.at(-1);
    expect(failed).toMatchObject({ status: 'failed', hasAudio: true });
    expect(failed.error).toMatch(/GROQ_API_KEY/);

    transcriber.failWith = null;
    const retried = await jo.post(`${entryUrl}/clips/${clipId}/retry`).set(H);
    expect(retried.status).toBe(202);
    await drainJobs();
    const after = (await jo.get(entryUrl)).body.entry.clips.at(-1);
    expect(after).toMatchObject({ status: 'transcribed', hasAudio: false, error: null });
    // Only failed recordings can be retried.
    expect((await jo.post(`${entryUrl}/clips/${clipId}/retry`).set(H)).status).toBe(409);
  });

  it('refuses unsupported audio and keeps every journal private', async () => {
    const wrong = await jo
      .post(`${entryUrl}/clips`)
      .set(H)
      .set('Content-Type', 'text/plain')
      .send('hello');
    expect(wrong.status).toBe(415);

    const reg = await eve.post('/api/v1/auth/register').set(H).send({
      email: 'eve@example.com',
      password: PASSWORD,
      displayName: 'Eve',
      timezone: 'Asia/Kolkata',
    });
    expect(reg.status).toBe(201);
    expect((await eve.get(entryUrl)).body.entry).toBeNull();
    expect((await eve.get('/api/v1/journal/search').query({ q: 'Dijkstra' })).body.results).toEqual(
      [],
    );
    const clipId = (await jo.get(entryUrl)).body.entry.clips[0].id;
    expect((await eve.delete(`${entryUrl}/clips/${clipId}`).set(H)).status).toBe(404);
    expect((await eve.post(`${entryUrl}/notes`).set(H)).status).toBe(400);

    const mine = await jo.get('/api/v1/journal/search').query({ q: 'dijkstra' });
    expect(mine.body.results).toHaveLength(1);
    expect(mine.body.results[0].match).toMatch(/Dijkstra/);
  });

  it('compiles the week and writes a summary on request', async () => {
    const week = await jo.get(`/api/v1/journal/weeks/${today}`);
    expect(week.status).toBe(200);
    expect(week.body.days).toHaveLength(7);
    expect(week.body.week.nights).toBe(1);
    expect(week.body.summaryStatus).toBe('idle');

    const asked = await jo.post(`/api/v1/journal/weeks/${today}/summary`).set(H);
    expect(asked.status).toBe(202);
    expect(asked.body.summaryStatus).toBe('queued');
    await drainJobs();
    const after = await jo.get(`/api/v1/journal/weeks/${today}`);
    expect(after.body).toMatchObject({
      summaryStatus: 'ready',
      summary: { headline: 'A graphs week.' },
    });
    const md = await jo.get(`/api/v1/journal/weeks/${today}/export`);
    expect(md.headers['content-type']).toMatch(/text\/markdown/);
    expect(md.text).toContain('A graphs week.');
  });

  it('skips the night reminder once tonight’s journal is done', async () => {
    const now = new Date();
    const n = await Notification.create({
      userId: joId,
      dedupeKey: `test-journal:${now.getTime()}`,
      kind: 'journal',
      fireAt: now,
      title: 'Tonight’s journal',
      url: `/journal/tonight?date=${today}`,
      condition: 'journal_pending',
      occurrenceDate: today,
      purgeAt: new Date(now.getTime() + 86_400_000),
    });
    await service.dispatchDue(new Date(now.getTime() + 1000));
    expect(await Notification.findById(n._id).lean()).toMatchObject({
      status: 'skipped_condition',
      statusReason: 'journal_done',
    });
  });

  it('exports the journal and removes kept recordings with the account', async () => {
    const md = await jo.get('/api/v1/journal/export').query({ format: 'markdown' });
    expect(md.status).toBe(200);
    expect(md.text).toContain(`## ${today} — Night journal`);

    await jo.patch('/api/v1/journal/settings').set(H).send({ keepAudio: true });
    await jo
      .post(`${entryUrl}/clips?duration=5`)
      .set(H)
      .set('Content-Type', 'audio/webm;codecs=opus')
      .send(Buffer.from('more bytes'));
    await drainJobs();
    expect(await audioFiles()).toBe(1);

    const deleted = await jo
      .delete('/api/v1/account')
      .set(H)
      .send({ password: PASSWORD, confirm: 'DELETE' });
    expect(deleted.status).toBe(200);
    expect(await audioFiles()).toBe(0);
    expect(await JournalEntry.countDocuments({ userId: joId })).toBe(0);
    expect(await AiJob.countDocuments({ userId: joId })).toBe(0);
  });
});
