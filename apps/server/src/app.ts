import cookieParser from 'cookie-parser';
import express, { type Express } from 'express';
import { pinoHttp } from 'pino-http';
import type { AppContext } from './context';
import { logger } from './lib/logger';
import { errorHandler } from './middleware/error-handler';
import { securityHeaders } from './middleware/security-headers';
import { createApiRouter } from './routes';
import { serveWebApp } from './web';

/** The Express application: security headers, request logging, the API and the PWA. */
export function createApp(ctx: AppContext): Express {
  const { env } = ctx;
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', env.trustProxy);

  app.use(securityHeaders(env));
  if (env.NODE_ENV !== 'test') {
    app.use(
      pinoHttp({
        logger,
        autoLogging: { ignore: (req) => req.url === '/api/health' },
        customLogLevel: (_req, res, err) =>
          err || res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info',
      }),
    );
  }
  app.use(cookieParser());

  app.use('/api', createApiRouter(ctx));
  if (env.WEB_DIST_DIR) serveWebApp(app, env.WEB_DIST_DIR);

  app.use(errorHandler);
  return app;
}
