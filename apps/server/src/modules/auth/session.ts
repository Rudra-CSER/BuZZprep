import type { Request, Response } from 'express';
import type { Types } from 'mongoose';
import type { Env } from '../../config/env';
import { Session, User, type ISession, type IUser } from '../../db/models';
import { randomToken, sha256 } from '../../lib/crypto';

const DAY = 86_400_000;
const LAST_SEEN_RESOLUTION_MS = 3_600_000;

/**
 * Sessions are opaque random tokens kept in an HttpOnly cookie. Only their SHA-256 hash is
 * stored, so a database leak doesn't expose usable sessions.
 */
export function sessionCookieName(env: Pick<Env, 'cookieSecure'>): string {
  // __Host- cookies must be Secure, Path=/ and host-only — the strongest scoping browsers offer.
  return env.cookieSecure ? '__Host-bp_session' : 'bp_session';
}

function setSessionCookie(res: Response, env: Env, token: string, expires: Date) {
  res.cookie(sessionCookieName(env), token, {
    httpOnly: true,
    secure: env.cookieSecure,
    sameSite: 'lax',
    path: '/',
    expires,
  });
}

export function clearSessionCookie(res: Response, env: Env) {
  res.clearCookie(sessionCookieName(env), {
    httpOnly: true,
    secure: env.cookieSecure,
    sameSite: 'lax',
    path: '/',
  });
}

/** Start a session for `userId` and set its cookie on the response. */
export async function createSession(
  req: Request,
  res: Response,
  env: Env,
  userId: Types.ObjectId,
): Promise<void> {
  const token = randomToken(32);
  const expiresAt = new Date(Date.now() + env.SESSION_TTL_DAYS * DAY);
  await Session.create({
    userId,
    tokenHash: sha256(token),
    expiresAt,
    userAgent: req.get('user-agent')?.slice(0, 300) ?? null,
  });
  setSessionCookie(res, env, token, expiresAt);
}

export async function deleteSession(sessionId: Types.ObjectId): Promise<void> {
  await Session.deleteOne({ _id: sessionId });
}

/** Sign out every device except the current one (after a password change). */
export async function deleteOtherSessions(
  userId: Types.ObjectId,
  keepSessionId: Types.ObjectId,
): Promise<void> {
  await Session.deleteMany({ userId, _id: { $ne: keepSessionId } });
}

export type SessionUser = Pick<IUser, '_id' | 'email' | 'displayName' | 'role'>;

/** The live session and its user for a cookie token, or null when invalid or expired. */
export async function findSession(
  token: string,
  now = Date.now(),
): Promise<{ session: ISession; user: SessionUser } | null> {
  const session = await Session.findOne({
    tokenHash: sha256(token),
    expiresAt: { $gt: new Date(now) },
  }).lean<ISession>();
  if (!session) return null;
  const user = await User.findById(session.userId)
    .select({ email: 1, displayName: 1, role: 1 })
    .lean<SessionUser>();
  return user ? { session, user } : null;
}

/**
 * Rolling expiry: extend a session once it is past half its lifetime, and record when it was
 * last used (at most hourly, to avoid a write per request).
 */
export async function touchSession(
  session: ISession,
  token: string,
  res: Response,
  env: Env,
  now = Date.now(),
): Promise<void> {
  const ttl = env.SESSION_TTL_DAYS * DAY;
  const update: Record<string, Date> = {};
  if (session.expiresAt.getTime() - now < ttl / 2) {
    update.expiresAt = new Date(now + ttl);
    setSessionCookie(res, env, token, update.expiresAt);
  }
  if (now - session.lastSeenAt.getTime() > LAST_SEEN_RESOLUTION_MS) {
    update.lastSeenAt = new Date(now);
  }
  if (Object.keys(update).length > 0) {
    await Session.updateOne({ _id: session._id }, { $set: update });
  }
}
