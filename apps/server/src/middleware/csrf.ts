import type { RequestHandler } from 'express';
import type { Env } from '../config/env';
import { forbidden } from '../lib/errors';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
export const CLIENT_HEADER = 'x-requested-with';
export const CLIENT_HEADER_VALUE = 'buzzprep';

/**
 * CSRF defence for cookie-authenticated requests:
 *  1. SameSite=Lax session cookie (see modules/auth/session.ts)
 *  2. state-changing requests must come from an allowed Origin, and
 *  3. carry a custom header, which cross-site forms cannot send and cross-origin
 *     scripts cannot send without a CORS preflight (which this API never grants).
 */
export function originGuard(env: Env): RequestHandler {
  return (req, _res, next) => {
    if (SAFE_METHODS.has(req.method)) return next();
    const origin = req.get('origin');
    if (origin && !env.allowedOrigins.includes(origin)) {
      throw forbidden('Cross-origin request blocked');
    }
    if (req.get(CLIENT_HEADER) !== CLIENT_HEADER_VALUE) {
      throw forbidden('Missing client header');
    }
    next();
  };
}
