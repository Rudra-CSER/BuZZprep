import type { Request, RequestHandler } from 'express';
import type { Env } from '../config/env';
import { unauthorized } from '../lib/errors';
import {
  clearSessionCookie,
  findSession,
  sessionCookieName,
  touchSession,
} from '../modules/auth/session';

/** Resolve the session cookie (if any) into `req.auth`. Never throws for anonymous requests. */
export function loadSession(env: Env): RequestHandler {
  return async (req, res, next) => {
    const token: unknown = req.cookies?.[sessionCookieName(env)];
    if (typeof token !== 'string' || token.length < 20 || token.length > 100) return next();

    const now = Date.now();
    const found = await findSession(token, now);
    if (!found) {
      clearSessionCookie(res, env);
      return next();
    }
    const { session, user } = found;
    req.auth = {
      userId: user._id,
      sessionId: session._id,
      role: user.role,
      email: user.email,
      displayName: user.displayName,
    };
    await touchSession(session, token, res, env, now);
    next();
  };
}

export const requireAuth: RequestHandler = (req, _res, next) => {
  if (!req.auth) throw unauthorized();
  next();
};

/** Narrow `req.auth` for handlers mounted behind requireAuth. */
export function auth(req: Request) {
  if (!req.auth) throw unauthorized();
  return req.auth;
}
