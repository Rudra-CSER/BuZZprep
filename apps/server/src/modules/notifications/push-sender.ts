import * as webpush from 'web-push';
import type { Env } from '../../config/env';

export interface PushTarget {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

export interface PushSendOptions {
  ttlSeconds: number;
  urgency: 'high' | 'normal' | 'low';
  topic?: string;
}

/** Thin seam over web-push so tests (and future transports) can swap the sender. */
export interface PushSender {
  readonly enabled: boolean;
  readonly publicKey: string | null;
  send(
    target: PushTarget,
    payload: string,
    options: PushSendOptions,
  ): Promise<{ statusCode: number }>;
}

export class PushSendError extends Error {
  constructor(
    message: string,
    readonly statusCode: number | null,
  ) {
    super(message);
  }
}

export function createWebPushSender(env: Env): PushSender {
  if (!env.pushEnabled) {
    return {
      enabled: false,
      publicKey: null,
      async send() {
        throw new PushSendError('Push is not configured (missing VAPID keys)', null);
      },
    };
  }
  const vapidDetails = {
    subject: env.VAPID_SUBJECT!,
    publicKey: env.VAPID_PUBLIC_KEY!,
    privateKey: env.VAPID_PRIVATE_KEY!,
  };
  return {
    enabled: true,
    publicKey: env.VAPID_PUBLIC_KEY!,
    async send(target, payload, options) {
      try {
        const result = await webpush.sendNotification(target, payload, {
          TTL: Math.max(0, Math.round(options.ttlSeconds)),
          urgency: options.urgency,
          ...(options.topic ? { topic: options.topic } : {}),
          vapidDetails,
          timeout: 10_000,
        });
        return { statusCode: result.statusCode };
      } catch (err) {
        const e = err as { statusCode?: number; body?: string; message?: string };
        throw new PushSendError(
          e.body?.slice(0, 300) || e.message || 'Push request failed',
          typeof e.statusCode === 'number' ? e.statusCode : null,
        );
      }
    },
  };
}
