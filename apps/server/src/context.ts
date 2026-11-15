import type { Env } from './config/env';
import type { AiService } from './modules/ai/ai.service';
import type { NotificationService } from './modules/notifications/notification.service';

/** Dependencies shared by every module router. Created once in index.ts (or by a test). */
export interface AppContext {
  env: Env;
  notifications: NotificationService;
  /** Optional AI providers for the journal (transcription, notes). */
  ai: AiService;
}
