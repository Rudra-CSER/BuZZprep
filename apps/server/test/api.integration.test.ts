import {
  addDays,
  configBundleSchema,
  defaultAnswers,
  logicalDateOf,
  logicalDateTime,
  type TimeContext,
} from '@buzzprep/shared';
import mongoose from 'mongoose';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { ensureIndexes } from '../src/db/connection';
import {
  Notification,
  PushSubscriptionModel,
  USER_OWNED_MODELS,
  type INotification,
} from '../src/db/models';
import { CLIENT_HEADERS as H, FakePushSender, ManualNotificationService, testEnv } from './helpers';

/**
 * End-to-end API tests against a real MongoDB.
 * Run with:  MONGODB_TEST_URI=mongodb://127.0.0.1:27017/buzzprep_test npm test -w @buzzprep/server
 * (`npm run dev:db` starts a local MongoDB in Docker.) Skipped when the variable is unset.
 */
const MONGO = process.env.MONGODB_TEST_URI;
const IST: TimeContext = { zone: 'Asia/Kolkata', dayBoundaryMinutes: 240 };
const IPHONE_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15';

describe.skipIf(!MONGO)('API integration (MongoDB)', () => {
  const env = testEnv();
  const push = new FakePushSender();
  const service = new ManualNotificationService(env, push);
  const app = createApp({ env, notifications: service });
  const ada = request.agent(app);
  const bob = request.agent(app);
  const today = logicalDateOf(Date.now(), IST);
  const sessionStart = logicalDateTime(today, '19:00', IST).toMillis();
  let adaId = '';
  let activityId = '';

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

  // ── Accounts ───────────────────────────────────────────────────────────────
  it('requires the invite code even for the first account in invite mode', async () => {
    const inviteApp = createApp({
      env: testEnv({ REGISTRATION_MODE: 'invite', INVITE_CODE: 'let-me-in-please' }),
      notifications: service,
    });
    const meta = await request(inviteApp).get('/api/meta');
    expect(meta.body).toMatchObject({ registrationMode: 'invite', setupRequired: true });
    const body = {
      email: 'stranger@example.com',
      password: 'correct horse battery',
      displayName: 'Stranger',
      timezone: 'UTC',
    };
    const without = await request(inviteApp).post('/api/v1/auth/register').set(H).send(body);
    const wrong = await request(inviteApp)
      .post('/api/v1/auth/register')
      .set(H)
      .send({ ...body, inviteCode: 'guess' });
    expect(without.status).toBe(403);
    expect(wrong.status).toBe(403);
  });

  it('registers the first account as admin with an httpOnly session cookie', async () => {
    const res = await ada.post('/api/v1/auth/register').set(H).send({
      email: 'Ada@Example.com',
      password: 'correct horse battery',
      displayName: 'Ada',
      timezone: 'Asia/Kolkata',
    });
    expect(res.status).toBe(201);
    expect(res.body.user).toMatchObject({ email: 'ada@example.com', role: 'admin' });
    expect(String(res.headers['set-cookie'])).toMatch(/bp_session=.+HttpOnly/i);
    adaId = res.body.user.id;
    const meta = await request(app).get('/api/meta');
    expect(meta.body.setupRequired).toBe(false);
  });

  it('rejects duplicate emails and gives the same answer for unknown users and wrong passwords', async () => {
    const dup = await request(app).post('/api/v1/auth/register').set(H).send({
      email: 'ada@example.com',
      password: 'another long pass',
      displayName: 'Copy',
      timezone: 'UTC',
    });
    expect(dup.status).toBe(409);
    const wrong = await request(app)
      .post('/api/v1/auth/login')
      .set(H)
      .send({ email: 'ada@example.com', password: 'not the password' });
    const unknown = await request(app)
      .post('/api/v1/auth/login')
      .set(H)
      .send({ email: 'nobody@example.com', password: 'not the password' });
    expect(wrong.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(unknown.body.error.message).toBe(wrong.body.error.message);
  });

  // ── Onboarding & schedule ──────────────────────────────────────────────────
  it('completes onboarding and generates plan, tracks, schedule and reminders', async () => {
    const answers = defaultAnswers('sde_interview', { timezone: 'Asia/Kolkata', today });
    answers.work = { ...answers.work, start: '11:00', end: '18:00' };
    answers.sleep = {
      currentBedtime: '02:30',
      currentWake: '09:30',
      targetBedtime: '01:15',
      targetWake: '08:45',
      gradualShift: true,
    };
    const res = await ada.post('/api/v1/onboarding/complete').set(H).send({ answers });
    expect(res.status).toBe(200);
    expect(res.body.summary).toMatchObject({ plan: true, tracks: 3 });
    expect(res.body.summary.activities).toBeGreaterThan(8);
    expect(res.body.summary.reminders).toBeGreaterThan(10);

    const me = await ada.get('/api/v1/auth/me');
    expect(me.body.onboardingCompleted).toBe(true);
    const plan = await ada.get('/api/v1/plans/active');
    expect(plan.body.plan.milestones).toHaveLength(6);
  });

  it('serves the agenda, including the overnight sleep block', async () => {
    const res = await ada.get('/api/v1/agenda').query({ from: today, to: today });
    expect(res.status).toBe(200);
    const titles = res.body.occurrences.map((o: { title: string }) => o.title);
    expect(titles).toContain('Sleep');
    expect(titles).toContain('Morning planning & journal');
    expect(res.body.today).toBe(today);
  });

  it('creates an activity together with its reminder presets', async () => {
    const res = await ada
      .post('/api/v1/activities')
      .set(H)
      .send({
        title: 'Test session',
        category: 'dsa',
        startTime: '19:00',
        durationMinutes: 60,
        recurrence: { freq: 'daily', startDate: today },
        priority: 'high',
        reminders: { upcomingMinutes: 10, atStart: true, overdueMinutes: 20 },
      });
    expect(res.status).toBe(201);
    expect(res.body.activity).toMatchObject({
      endTime: '20:00',
      recurrenceLabel: 'Every day',
      reminders: { upcomingMinutes: 10, atStart: true, overdueMinutes: 20 },
    });
    activityId = res.body.activity.id;
  });

  it('keeps every user’s data private', async () => {
    const reg = await bob.post('/api/v1/auth/register').set(H).send({
      email: 'bob@example.com',
      password: 'another long pass',
      displayName: 'Bob',
      timezone: 'Europe/Berlin',
    });
    expect(reg.body.user.role).toBe('user');
    expect((await bob.get(`/api/v1/activities/${activityId}`)).status).toBe(404);
    expect(
      (
        await bob
          .patch(`/api/v1/occurrences/${activityId}/${today}`)
          .set(H)
          .send({ status: 'completed' })
      ).status,
    ).toBe(404);
    expect(
      (await bob.get('/api/v1/agenda').query({ from: today, to: today })).body.occurrences,
    ).toEqual([]);
  });

  // ── Notifications ──────────────────────────────────────────────────────────
  describe('reminder delivery', () => {
    let upcoming: INotification;
    let token = '';

    it('registers a push subscription for an installed iPhone app', async () => {
      const res = await ada
        .post('/api/v1/push/subscriptions')
        .set({ ...H, 'User-Agent': IPHONE_UA })
        .send({
          endpoint: 'https://web.push.apple.com/QGuQyavXutnMH7wNlQ7xg0Mb',
          keys: {
            p256dh:
              'BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DkM',
            auth: 'tBHItJI5svbpez7KI4CCXg',
          },
          deviceLabel: 'iPhone · Home Screen',
        });
      expect(res.status).toBe(201);
      expect(res.body.subscription).toMatchObject({
        platform: 'ios',
        pushService: 'web.push.apple.com',
      });
      expect(res.body.subscription.keys).toBeUndefined();
    });

    it('plans reminders into the outbox and sends them when due', async () => {
      await service.reconcileUser(adaId, sessionStart - 30 * 60_000);
      const rows = await Notification.find({ userId: adaId, activityId, occurrenceDate: today })
        .sort({ fireAt: 1 })
        .lean<INotification[]>();
      expect(rows.map((n) => n.kind)).toEqual(['upcoming', 'start', 'overdue']);
      expect(rows.every((n) => n.status === 'pending')).toBe(true);

      await service.dispatchDue(new Date(sessionStart - 10 * 60_000));
      const sent = push.sent.find((p) => p.payload.notification.title === 'Test session in 10 min');
      expect(sent).toBeDefined();
      expect(sent!.payload).toMatchObject({ web_push: 8030, mutable: true });
      expect(sent!.payload.notification.navigate).toContain(
        `/schedule/occurrence/${activityId}/${today}?n=`,
      );
      expect(sent!.options.urgency).toBe('high');
      upcoming = (await Notification.findById(
        sent!.payload.notification.data.notificationId,
      ).lean<INotification>())!;
      token = sent!.payload.notification.data.token;
      expect(upcoming.status).toBe('sent');
    });

    it('re-planning is idempotent', async () => {
      const before = await Notification.countDocuments({ userId: adaId });
      await service.reconcileUser(adaId, sessionStart - 30 * 60_000);
      expect(await Notification.countDocuments({ userId: adaId })).toBe(before);
    });

    it('accepts delivery acknowledgements signed with the notification token only', async () => {
      const ok = await request(app)
        .post(`/api/v1/notifications/${upcoming._id}/events`)
        .set(H)
        .send({ type: 'delivered', token });
      expect(ok.status).toBe(200);
      const forged = await request(app)
        .post(`/api/v1/notifications/${upcoming._id}/events`)
        .set(H)
        .send({ type: 'delivered', token: '9999999999.forged' });
      expect(forged.status).toBe(401);
      expect((await Notification.findById(upcoming._id).lean())!.deliveredAt).toBeTruthy();
    });

    it('snoozes from a notification action', async () => {
      const res = await request(app)
        .post(`/api/v1/notifications/${upcoming._id}/events`)
        .set(H)
        .send({ type: 'action', action: 'snooze', snoozeMinutes: 5, token });
      expect(res.status).toBe(200);
      const snoozed = await Notification.findOne({
        userId: adaId,
        source: 'snooze',
      }).lean<INotification>();
      expect(snoozed!.fireAt.getTime()).toBe(Date.parse(res.body.snoozedUntil));
      push.sent = [];
      await service.process(snoozed!, snoozed!.fireAt);
      expect(push.sent[0]!.payload.notification.body).toMatch(/^Snoozed 5 min · /);
    });

    it('does not send "starts now" for a session that was already completed', async () => {
      const done = await ada
        .patch(`/api/v1/occurrences/${activityId}/${today}`)
        .set(H)
        .send({ status: 'completed', actualMinutes: 55 });
      expect(done.status).toBe(200);
      expect(done.body.occurrence).toMatchObject({ status: 'completed', actualMinutes: 55 });
      const startRow = await Notification.findOne({
        userId: adaId,
        activityId,
        occurrenceDate: today,
        kind: 'start',
      }).lean<INotification>();
      push.sent = [];
      await service.process(startRow!, new Date(sessionStart));
      expect(push.sent).toHaveLength(0);
      const after = await Notification.findById(startRow!._id).lean<INotification>();
      expect(after).toMatchObject({
        status: 'skipped_condition',
        statusReason: 'occurrence_completed',
      });
    });

    it('sends a real test push and drops subscriptions the push service reports as gone', async () => {
      const ok = await ada.post('/api/v1/push/test').set(H).send({});
      expect(ok.status).toBe(200);
      expect(ok.body.results).toEqual([expect.objectContaining({ statusCode: 201 })]);

      push.failWith = 410;
      const gone = await ada.post('/api/v1/push/test').set(H).send({});
      push.failWith = null;
      expect(gone.body.notification).toMatchObject({
        status: 'no_subscription',
        statusReason: 'subscriptions_expired',
      });
      expect(await PushSubscriptionModel.countDocuments({ userId: adaId })).toBe(0);
    });
  });

  // ── Missed sessions ────────────────────────────────────────────────────────
  it('lists missed sessions, suggests free slots and reschedules without overlaps', async () => {
    const yesterday = addDays(today, -1);
    const created = await ada
      .post('/api/v1/activities')
      .set(H)
      .send({
        title: 'Missed practice',
        category: 'dsa',
        startTime: '10:00',
        durationMinutes: 45,
        recurrence: { freq: 'once', date: yesterday },
      });
    const missedId = created.body.activity.id;

    const review = await ada.get('/api/v1/occurrences/review');
    expect(review.body.occurrences.map((o: { activityId: string }) => o.activityId)).toContain(
      missedId,
    );

    const sugg = await ada.get(`/api/v1/occurrences/${missedId}/${yesterday}/suggestions`);
    expect(sugg.status).toBe(200);
    expect(sugg.body.suggestions.length).toBeGreaterThan(0);
    const slot = sugg.body.suggestions[0];

    const moved = await ada
      .post(`/api/v1/occurrences/${missedId}/${yesterday}/reschedule`)
      .set(H)
      .send({ date: slot.date, startTime: slot.startTime });
    expect(moved.status).toBe(200);
    expect(moved.body.occurrence).toMatchObject({
      rescheduled: true,
      displayDate: slot.date,
      startTime: slot.startTime,
    });
    expect(moved.body.conflicts).toEqual([]);

    const after = await ada.get('/api/v1/occurrences/review');
    expect(after.body.occurrences.map((o: { activityId: string }) => o.activityId)).not.toContain(
      missedId,
    );
  });

  it('switches day modes without changing the template', async () => {
    const set = await ada.put(`/api/v1/day-modes/${today}`).set(H).send({ mode: 'recovery' });
    expect(set.body.dayModes[today]).toBe('recovery');
    const agenda = await ada.get('/api/v1/agenda').query({ from: today, to: today });
    const session = agenda.body.occurrences.find(
      (o: { activityId: string }) => o.activityId === activityId,
    );
    expect(session.modeAction).toBe('skip');
    await ada.put(`/api/v1/day-modes/${today}`).set(H).send({ mode: 'normal' });
    const activity = await ada.get(`/api/v1/activities/${activityId}`);
    expect(activity.body.activity.durationMinutes).toBe(60);
  });

  it('builds the dashboard', async () => {
    const res = await ada.get('/api/v1/dashboard');
    expect(res.status).toBe(200);
    expect(res.body.plan.progress.totalDays).toBeGreaterThan(150);
    expect(res.body.week.days).toHaveLength(7);
    expect(res.body).toHaveProperty('completion');
    expect(res.body).toHaveProperty('nextReminder');
    expect(res.body.dsa).toMatchObject({ total: 0, independent: 0 });
  });

  // ── Portability & deletion ─────────────────────────────────────────────────
  it('exports a valid config bundle that another user can import', async () => {
    const exported = await ada.get('/api/v1/config/export');
    expect(exported.status).toBe(200);
    const bundle = configBundleSchema.parse(exported.body);
    expect(bundle.schedule!.activities.length).toBeGreaterThan(8);

    const imported = await bob.post('/api/v1/config/import').set(H).send({ bundle, mode: 'merge' });
    expect(imported.status).toBe(200);
    expect(imported.body.summary.activities).toBe(bundle.schedule!.activities.length);
    expect((await bob.get('/api/v1/auth/me')).body.onboardingCompleted).toBe(true);
  });

  it('exports all account data and deletes the account completely', async () => {
    const exported = await ada.get('/api/v1/account/export');
    expect(exported.status).toBe(200);
    expect(exported.body.data.activities.length).toBeGreaterThan(0);

    const refused = await ada
      .delete('/api/v1/account')
      .set(H)
      .send({ password: 'wrong', confirm: 'DELETE' });
    expect(refused.status).toBe(401);
    const deleted = await ada
      .delete('/api/v1/account')
      .set(H)
      .send({ password: 'correct horse battery', confirm: 'DELETE' });
    expect(deleted.status).toBe(200);
    for (const [name, model] of Object.entries(USER_OWNED_MODELS)) {
      expect(await model.countDocuments({ userId: adaId }), name).toBe(0);
    }
    expect((await ada.get('/api/v1/auth/me')).status).toBe(401);
    // Bob is untouched.
    expect((await bob.get('/api/v1/auth/me')).status).toBe(200);
  });
});
