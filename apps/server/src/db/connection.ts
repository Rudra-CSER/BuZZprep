import mongoose from 'mongoose';
import { logger } from '../lib/logger';
import { ALL_MODELS } from './models';

export async function connectDatabase(uri: string, attempts = 10): Promise<typeof mongoose> {
  mongoose.set('strictQuery', true);
  // Indexes are created explicitly below so failures are logged instead of silently ignored.
  mongoose.set('autoIndex', false);
  for (let attempt = 1; ; attempt++) {
    try {
      await mongoose.connect(uri, { serverSelectionTimeoutMS: 10_000 });
      break;
    } catch (err) {
      if (attempt >= attempts) throw err;
      // MongoDB may still be starting (e.g. docker compose up) — retry with backoff.
      const delay = Math.min(15_000, 1000 * 2 ** attempt);
      logger.warn({ attempt, delayMs: delay }, 'MongoDB not reachable yet, retrying');
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  logger.info({ db: mongoose.connection.name }, 'Connected to MongoDB');
  await ensureIndexes();
  return mongoose;
}

export async function ensureIndexes(): Promise<void> {
  for (const model of ALL_MODELS) {
    try {
      await model.createIndexes();
    } catch (err) {
      logger.error({ err, model: model.modelName }, 'Failed to create indexes');
    }
  }
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
}

export function databaseState(): 'connected' | 'connecting' | 'disconnected' {
  const state = mongoose.connection.readyState;
  if (state === 1) return 'connected';
  if (state === 2) return 'connecting';
  return 'disconnected';
}
