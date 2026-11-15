import { Router } from 'express';
import type { AppContext } from '../../context';
import { databaseState } from '../../db/connection';
import { isSetupRequired } from '../auth/auth.service';

export const APP_VERSION = '0.1.0';

/** /api/health and /api/meta — public, unversioned. */
export function metaRouter({ env, notifications, ai }: AppContext): Router {
  const r = Router();

  r.get('/health', (_req, res) => {
    const db = databaseState();
    res.status(db === 'connected' ? 200 : 503).json({
      status: db === 'connected' ? 'ok' : 'degraded',
      db,
      time: new Date().toISOString(),
    });
  });

  /** Public instance information the PWA needs before sign-in. */
  r.get('/meta', async (_req, res) => {
    res.json({
      name: 'buZZprep',
      version: APP_VERSION,
      registrationMode: env.REGISTRATION_MODE,
      pushEnabled: notifications.pushEnabled,
      // Which journal AI features exist (booleans only: no providers, models or keys).
      journalAi: ai.availability,
      setupRequired: databaseState() === 'connected' ? await isSetupRequired() : false,
      // How a forgotten password is reset here: an emailed link, or a link from the owner.
      passwordReset: env.SMTP_URL ? 'email' : 'owner',
    });
  });

  return r;
}
