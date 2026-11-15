import type { Types } from 'mongoose';
import { loadEnv } from '../src/config/env';
import {
  PushSendError,
  type PushSender,
  type PushSendOptions,
  type PushTarget,
} from '../src/modules/notifications/push-sender';
import { NotificationService } from '../src/modules/notifications/notification.service';

export const APP_ORIGIN = 'http://localhost:5173';
export const CLIENT_HEADERS = { 'X-Requested-With': 'buzzprep', Origin: APP_ORIGIN };

export function testEnv(overrides: Record<string, string> = {}) {
  return loadEnv({
    NODE_ENV: 'test',
    PUBLIC_APP_URL: APP_ORIGIN,
    SESSION_SECRET: 'test-secret-'.padEnd(48, 'x'),
    LOG_LEVEL: 'silent',
    ...overrides,
  });
}

/** Records pushes instead of sending them; can simulate push-service failures. */
export class FakePushSender implements PushSender {
  readonly enabled = true;
  readonly publicKey = 'BFakePublicKeyForTests';
  sent: Array<{ endpoint: string; payload: any; options: PushSendOptions }> = [];
  failWith: number | null = null;

  async send(target: PushTarget, payload: string, options: PushSendOptions) {
    if (this.failWith !== null) throw new PushSendError('simulated failure', this.failWith);
    this.sent.push({ endpoint: target.endpoint, payload: JSON.parse(payload), options });
    return { statusCode: 201 };
  }
}

/** Reconciles only when a test asks for it, so results never depend on the wall clock. */
export class ManualNotificationService extends NotificationService {
  queued = new Set<string>();
  override queueReconcile(userId: Types.ObjectId | string) {
    this.queued.add(userId.toString());
  }
}
