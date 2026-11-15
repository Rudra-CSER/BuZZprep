import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString('base64url');
}

export function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

export function hmac(secret: string, value: string): string {
  return createHmac('sha256', secret).update(value).digest('base64url');
}

export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

/**
 * Short-lived capability token for one notification, embedded in the push payload so the
 * service worker can acknowledge delivery or run an action (snooze / done) without a session.
 * Format: `<expiresAtSeconds>.<signature>`; the signature binds notification id + user id.
 */
export function signNotificationToken(
  secret: string,
  notificationId: string,
  userId: string,
  ttlSeconds = 7 * 24 * 3600,
  now = Date.now(),
): string {
  const exp = Math.floor(now / 1000) + ttlSeconds;
  return `${exp}.${hmac(secret, `ntf.${notificationId}.${userId}.${exp}`)}`;
}

export function verifyNotificationToken(
  secret: string,
  token: string,
  notificationId: string,
  userId: string,
  now = Date.now(),
): boolean {
  const [expRaw, sig] = token.split('.');
  const exp = Number(expRaw);
  if (!sig || !Number.isFinite(exp) || exp * 1000 < now) return false;
  return safeEqual(sig, hmac(secret, `ntf.${notificationId}.${userId}.${exp}`));
}
