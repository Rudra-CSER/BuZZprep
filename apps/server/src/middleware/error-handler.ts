import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError } from 'zod';
import { AppError, notFound } from '../lib/errors';
import { logger } from '../lib/logger';

export const notFoundHandler: RequestHandler = (req) => {
  throw notFound(`Route ${req.method} ${req.path}`);
};

/** Maps every error to `{ error: { code, message, … } }` with a fitting status code. */
export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  if (res.headersSent) return;
  if (err instanceof ZodError) {
    res.status(400).json({
      error: {
        code: 'validation_error',
        message: err.issues[0]?.message ?? 'Some fields need attention',
        issues: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
      },
    });
    return;
  }
  if (err instanceof AppError) {
    res.status(err.status).json({
      error: { code: err.code, message: err.message, details: err.details },
    });
    return;
  }
  const e = err as { code?: number; name?: string; type?: string; status?: number };
  if (e.code === 11000) {
    res.status(409).json({ error: { code: 'conflict', message: 'That already exists.' } });
    return;
  }
  if (e.name === 'CastError') {
    res.status(400).json({ error: { code: 'bad_request', message: 'Invalid identifier.' } });
    return;
  }
  if (e.type === 'entity.too.large') {
    res.status(413).json({ error: { code: 'too_large', message: 'Request body is too large.' } });
    return;
  }
  if (e.type === 'entity.parse.failed') {
    res.status(400).json({ error: { code: 'bad_request', message: 'Invalid JSON body.' } });
    return;
  }
  logger.error({ err, path: req.path, method: req.method }, 'Unhandled error');
  res.status(500).json({ error: { code: 'internal_error', message: 'Something went wrong.' } });
};
