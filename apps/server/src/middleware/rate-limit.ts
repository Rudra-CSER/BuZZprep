import { ipKeyGenerator, rateLimit } from 'express-rate-limit';

const limitMessage = (message: string) => ({ error: { code: 'rate_limited', message } });

/** Every API request, per IP. */
export const apiLimiter = rateLimit({
  windowMs: 60_000,
  limit: 300,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: limitMessage('Too many requests — slow down a little.'),
});

/** Sign-in and registration, per IP. */
export const authLimiter = rateLimit({
  windowMs: 15 * 60_000,
  limit: 20,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: limitMessage('Too many sign-in attempts. Try again in a few minutes.'),
});

/** Per-user limiter for expensive or abusable endpoints (test pushes, exports). */
export const userLimiter = (limit: number, windowMs = 60_000) =>
  rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    keyGenerator: (req) => req.auth?.userId.toHexString() ?? ipKeyGenerator(req.ip ?? ''),
    message: limitMessage('You are doing that too often. Try again shortly.'),
  });
