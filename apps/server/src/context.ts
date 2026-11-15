import type { Env } from './config/env';
import type { NotificationService } from './modules/notifications/notification.service';

/** Dependencies shared by every module router. Created once in index.ts (or by a test). */
export interface AppContext {
  env: Env;
  notifications: NotificationService;
}
