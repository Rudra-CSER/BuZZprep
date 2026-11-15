import type { Env } from './config/env';
import type { Mailer } from './lib/mailer';
import type { AiService } from './modules/ai/ai.service';
import type { NotificationService } from './modules/notifications/notification.service';

/** Dependencies shared by every module router. Created once in index.ts (or by a test). */
export interface AppContext {
  env: Env;
  notifications: NotificationService;
  /** Optional AI providers for the journal (transcription, notes). */
  ai: AiService;
  /** Email for password resets; null when SMTP isn't configured. */
  mailer: Mailer | null;
}
