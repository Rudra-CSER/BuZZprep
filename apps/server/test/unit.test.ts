import mongoose, { Types } from 'mongoose';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { loadEnv } from '../src/config/env';
import { signNotificationToken, verifyNotificationToken } from '../src/lib/crypto';
import { toApi } from '../src/lib/serialize';
import { buildPushPayload } from '../src/modules/notifications/payload';
import {
  classifyPushFailure,
  missedDigestBody,
  retryDelayMs,
} from '../src/modules/notifications/delivery-policy';
import { CLIENT_HEADERS, FakePushSender, ManualNotificationService, testEnv } from './helpers';

// These tests never touch MongoDB; fail fast if something tries to.
mongoose.set('bufferCommands', false);

describe('environment', () => {
  it('derives origins and cookie security from PUBLIC_APP_URL', () => {
    const env = loadEnv({
      PUBLIC_APP_URL: 'https://prep.example.com/',
      ALLOWED_ORIGINS: 'https://alt.example.com',
    });
    expect(env.appOrigin).toBe('https://prep.example.com');
    expect(env.allowedOrigins).toEqual(['https://prep.example.com', 'https://alt.example.com']);
    expect(env.cookieSecure).toBe(true);
    expect(env.pushEnabled).toBe(false);
  });

  it('refuses unsafe production configuration', () => {
    expect(() => loadEnv({ NODE_ENV: 'production' })).toThrow(/SESSION_SECRET/);
    expect(() => loadEnv({ VAPID_PUBLIC_KEY: 'x' })).toThrow(/VAPID/);
    expect(() => loadEnv({ REGISTRATION_MODE: 'invite' })).toThrow(/INVITE_CODE/);
    expect(() =>
      loadEnv({
        VAPID_PUBLIC_KEY: 'a',
        VAPID_PRIVATE_KEY: 'b',
        VAPID_SUBJECT: 'admin@example.com',
      }),
    ).toThrow(/mailto/);
    const ok = loadEnv({
      VAPID_PUBLIC_KEY: 'a',
      VAPID_PRIVATE_KEY: 'b',
      VAPID_SUBJECT: 'mailto:me@example.com',
    });
    expect(ok.pushEnabled).toBe(true);
  });

  it('treats empty values from a copied .env.example as unset', () => {
    const env = loadEnv({
      SESSION_SECRET: '',
      VAPID_PUBLIC_KEY: '',
      VAPID_PRIVATE_KEY: ' ',
      VAPID_SUBJECT: '',
      PORT: '',
    });
    expect(env.SESSION_SECRET.length).toBeGreaterThanOrEqual(32);
    expect(env.PORT).toBe(4000);
    expect(env.pushEnabled).toBe(false);
  });
});

describe('notification tokens', () => {
  const secret = 'k'.repeat(40);
  const id = new Types.ObjectId().toHexString();
  const user = new Types.ObjectId().toHexString();

  it('verifies only for the same notification, user and secret, before expiry', () => {
    const token = signNotificationToken(secret, id, user, 3600, 1_000_000);
    expect(verifyNotificationToken(secret, token, id, user, 1_000_000)).toBe(true);
    expect(
      verifyNotificationToken(secret, token, new Types.ObjectId().toHexString(), user, 1_000_000),
    ).toBe(false);
    expect(
      verifyNotificationToken(secret, token, id, new Types.ObjectId().toHexString(), 1_000_000),
    ).toBe(false);
    expect(verifyNotificationToken('other'.repeat(10), token, id, user, 1_000_000)).toBe(false);
    expect(verifyNotificationToken(secret, token, id, user, 1_000_000 + 3601_000)).toBe(false);
    expect(verifyNotificationToken(secret, `${token}x`, id, user, 1_000_000)).toBe(false);
    expect(verifyNotificationToken(secret, 'garbage', id, user, 1_000_000)).toBe(false);
  });
});

describe('push payload', () => {
  const env = { appOrigin: 'https://prep.example.com', SESSION_SECRET: 's'.repeat(40) };
  const base = {
    _id: new Types.ObjectId(),
    userId: new Types.ObjectId(),
    kind: 'start' as const,
    title: 'Time for DSA deep work',
    body: '7:00 PM – 8:10 PM · DSA',
    url: '/schedule/occurrence/abc/2026-11-13',
    tag: 'occ:abc:2026-11-13',
    fireAt: new Date('2026-11-13T13:30:00Z'),
    activityId: new Types.ObjectId(),
    occurrenceDate: '2026-11-13',
  };

  it('uses the Declarative Web Push format with a deep link and a signed token', () => {
    const p = buildPushPayload(base, env, 10);
    expect(p.web_push).toBe(8030);
    expect(p.mutable).toBe(true);
    expect(p.notification.navigate).toBe(
      `https://prep.example.com/schedule/occurrence/abc/2026-11-13?n=${base._id.toHexString()}`,
    );
    expect(p.notification.data.url).toBe(
      `/schedule/occurrence/abc/2026-11-13?n=${base._id.toHexString()}`,
    );
    expect(
      verifyNotificationToken(
        env.SESSION_SECRET,
        p.notification.data.token,
        base._id.toHexString(),
        base.userId.toHexString(),
      ),
    ).toBe(true);
    expect(p.notification.actions?.map((a) => a.action)).toEqual(['complete', 'snooze']);
    expect(p.notification.actions?.[1]?.title).toBe('Snooze 10 min');
  });

  it('omits actions for non-activity notifications', () => {
    const p = buildPushPayload(
      {
        ...base,
        kind: 'weekly_review',
        activityId: null,
        occurrenceDate: null,
        url: '/journal?type=weekly',
      },
      env,
      10,
    );
    expect('actions' in p.notification).toBe(false);
    expect(p.notification.navigate).toContain('/journal?type=weekly&n=');
  });
});

describe('delivery policy helpers', () => {
  it('classifies push-service responses', () => {
    expect(classifyPushFailure(410)).toEqual({ gone: true, retryable: false });
    expect(classifyPushFailure(404)).toEqual({ gone: true, retryable: false });
    expect(classifyPushFailure(429).retryable).toBe(true);
    expect(classifyPushFailure(503).retryable).toBe(true);
    expect(classifyPushFailure(null).retryable).toBe(true);
    expect(classifyPushFailure(403)).toEqual({ gone: false, retryable: false });
  });

  it('backs off exponentially and summarizes missed sessions kindly', () => {
    expect([1, 2, 3].map(retryDelayMs)).toEqual([60_000, 120_000, 240_000]);
    expect(missedDigestBody(['DSA deep work'])).toBe(
      'DSA deep work needs a decision: done, skip, or a new slot?',
    );
    expect(missedDigestBody(['A', 'B', 'C'])).toBe('A and 2 more need a decision.');
  });
});

describe('serialization', () => {
  it('renames ids, stringifies ObjectIds and drops internal fields at the top level', () => {
    const id = new Types.ObjectId();
    const out = toApi<any>([
      {
        _id: id,
        userId: id,
        __v: 0,
        milestones: [{ _id: id, title: 'x', __v: 1 }],
        at: new Date(0),
      },
    ]);
    expect(out).toEqual([
      {
        id: id.toHexString(),
        milestones: [{ id: id.toHexString(), title: 'x' }],
        at: '1970-01-01T00:00:00.000Z',
      },
    ]);
  });
});

describe('HTTP layer (no database)', () => {
  const env = testEnv();
  const app = createApp({
    env,
    notifications: new ManualNotificationService(env, new FakePushSender()),
  });

  it('reports health as degraded without a database', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(503);
    expect(res.body).toMatchObject({ status: 'degraded', db: 'disconnected' });
  });

  it('exposes public instance metadata', async () => {
    const res = await request(app).get('/api/meta');
    expect(res.body).toMatchObject({
      name: 'buZZprep',
      registrationMode: 'open',
      pushEnabled: true,
    });
  });

  it('sets security headers', async () => {
    const res = await request(app).get('/api/meta');
    expect(res.headers['content-security-policy']).toContain("default-src 'self'");
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['cache-control']).toBe('no-store');
  });

  it('blocks state-changing requests without the client header or from foreign origins', async () => {
    const noHeader = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'a@b.co', password: 'x' });
    expect(noHeader.status).toBe(403);
    const foreign = await request(app)
      .post('/api/v1/auth/login')
      .set({ ...CLIENT_HEADERS, Origin: 'https://evil.example' })
      .send({ email: 'a@b.co', password: 'x' });
    expect(foreign.status).toBe(403);
  });

  it('validates input before touching the database', async () => {
    const res = await request(app).post('/api/v1/auth/register').set(CLIENT_HEADERS).send({
      email: 'not-an-email',
      password: 'short',
      displayName: '',
      timezone: 'Nowhere/City',
    });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('validation_error');
    const paths = res.body.error.issues.map((i: { path: string }) => i.path);
    expect(paths).toEqual(expect.arrayContaining(['email', 'password', 'displayName', 'timezone']));
  });

  it('requires a session for private routes', async () => {
    for (const path of [
      '/api/v1/dashboard',
      '/api/v1/agenda?from=2026-11-13&to=2026-11-13',
      '/api/v1/profile',
      '/api/v1/push/subscriptions',
    ]) {
      const res = await request(app).get(path);
      expect(res.status, path).toBe(401);
    }
  });

  it('rejects malformed JSON cleanly', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .set({ ...CLIENT_HEADERS, 'Content-Type': 'application/json' })
      .send('{"email":');
    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/JSON/);
  });
});
