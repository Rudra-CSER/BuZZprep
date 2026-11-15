import type { Server } from 'node:http';
import { createApp } from './app';
import { loadDotEnv } from './config/dotenv';
import { isDevSecret, loadEnv } from './config/env';
import { connectDatabase, disconnectDatabase } from './db/connection';
import { createLogger, logger, setLogger } from './lib/logger';
import { createAiService } from './modules/ai/ai.service';
import { startJournalWorker } from './modules/journal/journal-worker';
import { createWebPushSender } from './modules/notifications/push-sender';
import { startScheduler } from './modules/notifications/scheduler';
import { NotificationService } from './modules/notifications/notification.service';

async function main() {
  loadDotEnv();
  const env = loadEnv();
  setLogger(createLogger(env.LOG_LEVEL, env.NODE_ENV === 'development'));

  if (isDevSecret(env.SESSION_SECRET)) {
    logger.warn('Using the built-in development SESSION_SECRET. Set your own before deploying.');
  }
  if (!env.pushEnabled) {
    logger.warn(
      'Web Push is disabled: VAPID keys are not set. Run `npm run vapid:generate` and add them to .env.',
    );
  }

  const ai = createAiService(env);
  const { transcription, notes } = ai.availability;
  logger.info(
    {
      voice: transcription ? ai.describe().transcription : 'off',
      notes: notes ? ai.describe().notes : 'off',
    },
    'Journal AI',
  );
  for (const note of ai.notes) logger[note.level](note.message);

  await connectDatabase(env.MONGODB_URI);
  const notifications = new NotificationService(env, createWebPushSender(env));

  let server: Server | null = null;
  let stopScheduler: (() => void) | null = null;
  let stopJournalWorker: (() => void) | null = null;

  if (env.APP_ROLE !== 'worker') {
    const app = createApp({ env, notifications, ai });
    server = app.listen(env.PORT, env.HOST, () => {
      logger.info(
        { port: env.PORT, url: env.PUBLIC_APP_URL, role: env.APP_ROLE },
        'buZZprep API listening',
      );
    });
  }
  if (env.APP_ROLE !== 'api') {
    stopScheduler = startScheduler(notifications, env);
    stopJournalWorker = startJournalWorker(ai, env);
  }

  let shuttingDown = false;
  const shutdown = async (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info({ signal }, 'Shutting down');
    stopScheduler?.();
    stopJournalWorker?.();
    await new Promise<void>((resolve) => (server ? server.close(() => resolve()) : resolve()));
    await notifications.flush().catch(() => undefined);
    notifications.stop();
    await disconnectDatabase();
    process.exit(0);
  };
  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

main().catch((err) => {
  logger.fatal({ err }, 'Failed to start');
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
