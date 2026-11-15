// Minimal types for web-push 4.x (ESM, ships without declarations).
declare module 'web-push' {
  export interface PushSubscription {
    endpoint: string;
    expirationTime?: number | null;
    keys: { p256dh: string; auth: string };
  }

  export interface RequestOptions {
    TTL?: number;
    urgency?: 'very-low' | 'low' | 'normal' | 'high';
    topic?: string;
    headers?: Record<string, string>;
    timeout?: number;
    contentEncoding?: 'aesgcm' | 'aes128gcm';
    vapidDetails?: { subject: string; publicKey: string; privateKey: string };
  }

  export interface SendResult {
    statusCode: number;
    body: string;
    headers: Record<string, string>;
  }

  export class WebPushError extends Error {
    statusCode: number;
    headers: Record<string, string>;
    body: string;
    endpoint: string;
  }

  export function sendNotification(
    subscription: PushSubscription,
    payload?: string | Buffer | null,
    options?: RequestOptions,
  ): Promise<SendResult>;

  export function setVapidDetails(subject: string, publicKey: string, privateKey: string): void;

  export function generateVAPIDKeys(): { publicKey: string; privateKey: string };
}
