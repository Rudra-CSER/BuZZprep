import mongoose from 'mongoose';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { ensureIndexes } from '../src/db/connection';
import { PasswordReset } from '../src/db/models';
import {
  CLIENT_HEADERS as H,
  FakeMailer,
  FakePushSender,
  ManualNotificationService,
  testEnv,
} from './helpers';

/**
 * Forgot password, end to end against a real MongoDB.
 * Run with:  MONGODB_TEST_URI=mongodb://127.0.0.1:27017/buzzprep_test npm test -w @buzzprep/server
 */
const MONGO = process.env.MONGODB_TEST_URI;

const tokenOf = (mail: { text: string }) => /#token=([\w-]+)/.exec(mail.text)?.[1] ?? '';

async function waitFor(check: () => boolean, ms = 2000) {
  const end = Date.now() + ms;
  while (!check() && Date.now() < end) await new Promise((r) => setTimeout(r, 20));
}

describe.skipIf(!MONGO)('Password reset (MongoDB)', () => {
  const env = testEnv({ SMTP_URL: 'smtp://localhost:2525' });
  const mailer = new FakeMailer();
  const notifications = new ManualNotificationService(env, new FakePushSender());
  const app = createApp({ env, notifications, mailer });
  const ada = request.agent(app);
  const account = {
    email: 'ada@example.com',
    password: 'old-password-123',
    displayName: 'Ada',
    timezone: 'Asia/Kolkata',
  };

  beforeAll(async () => {
    await mongoose.connect(MONGO!);
    await mongoose.connection.dropDatabase();
    await ensureIndexes();
    await ada.post('/api/v1/auth/register').set(H).send(account).expect(201);
  });

  afterAll(async () => {
    notifications.stop();
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });

  it('tells the app that resets go by email', async () => {
    const meta = await request(app).get('/api/meta').expect(200);
    expect(meta.body.passwordReset).toBe('email');
  });

  it('answers the same for an unknown address and sends nothing', async () => {
    await request(app)
      .post('/api/v1/auth/password/forgot')
      .set(H)
      .send({ email: 'nobody@example.com' })
      .expect(202, { ok: true });
    await new Promise((r) => setTimeout(r, 100));
    expect(mailer.sent).toHaveLength(0);
  });

  it('emails one link, then waits before sending another', async () => {
    await request(app)
      .post('/api/v1/auth/password/forgot')
      .set(H)
      .send({ email: 'ADA@example.com' })
      .expect(202);
    await waitFor(() => mailer.sent.length === 1);
    expect(mailer.sent[0]!.to).toBe('ada@example.com');
    expect(tokenOf(mailer.sent[0]!)).not.toBe('');

    await request(app)
      .post('/api/v1/auth/password/forgot')
      .set(H)
      .send({ email: 'ada@example.com' })
      .expect(202);
    await new Promise((r) => setTimeout(r, 100));
    expect(mailer.sent).toHaveLength(1);
    // Only the token's hash is stored.
    const stored = await PasswordReset.findOne().lean();
    expect(stored?.tokenHash).not.toContain(tokenOf(mailer.sent[0]!));
  });

  it('rejects a wrong token and a short password', async () => {
    await request(app)
      .patch('/api/v1/auth/password')
      .set(H)
      .send({ token: 'x'.repeat(43), password: 'new-password-456' })
      .expect(410);
    await request(app)
      .patch('/api/v1/auth/password')
      .set(H)
      .send({ token: tokenOf(mailer.sent[0]!), password: 'short' })
      .expect(400);
  });

  it('sets the new password, signs in here and out everywhere else', async () => {
    const token = tokenOf(mailer.sent[0]!);
    const device = request.agent(app);
    const res = await device
      .patch('/api/v1/auth/password')
      .set(H)
      .send({ token, password: 'new-password-456' })
      .expect(200);
    expect(res.body.user.email).toBe('ada@example.com');
    expect(String(res.headers['set-cookie'])).toContain('bp_session=');
    await device.get('/api/v1/auth/me').expect(200);
    // The session Ada had before is gone.
    await ada.get('/api/v1/auth/me').expect(401);

    await request(app)
      .post('/api/v1/auth/login')
      .set(H)
      .send({ email: account.email, password: account.password })
      .expect(401);
    await request(app)
      .post('/api/v1/auth/login')
      .set(H)
      .send({ email: account.email, password: 'new-password-456' })
      .expect(200);

    // A link works once.
    await request(app)
      .patch('/api/v1/auth/password')
      .set(H)
      .send({ token, password: 'another-password-789' })
      .expect(410);
  });

  it('refuses an expired link', async () => {
    await PasswordReset.deleteMany({});
    mailer.sent = [];
    await request(app)
      .post('/api/v1/auth/password/forgot')
      .set(H)
      .send({ email: 'ada@example.com' })
      .expect(202);
    await waitFor(() => mailer.sent.length === 1);
    await PasswordReset.updateMany({}, { $set: { expiresAt: new Date(Date.now() - 1000) } });
    await request(app)
      .patch('/api/v1/auth/password')
      .set(H)
      .send({ token: tokenOf(mailer.sent[0]!), password: 'too-late-password' })
      .expect(410);
  });
});
