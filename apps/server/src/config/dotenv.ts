import { existsSync } from 'node:fs';
import path from 'node:path';

/**
 * Load a .env file for local development: the current directory first, then the repo root
 * (npm workspace scripts run from apps/server). Real environment variables always win.
 * In Docker, configuration comes from the container environment instead.
 */
export function loadDotEnv(): string | null {
  const candidates = [path.resolve('.env'), path.resolve('../../.env')];
  for (const file of candidates) {
    if (existsSync(file)) {
      process.loadEnvFile(file);
      return file;
    }
  }
  return null;
}
