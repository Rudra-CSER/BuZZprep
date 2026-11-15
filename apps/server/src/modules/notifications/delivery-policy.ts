import { createHash } from 'node:crypto';

/** Outbox rows are deleted this long after their planned time (TTL index on `purgeAt`). */
export const PURGE_AFTER_MS = 30 * 86_400_000;

/** Delivery attempts per notification before it is marked failed. */
export const MAX_ATTEMPTS = 3;

/** How long a claimed row stays locked before another worker may retry it. */
export const CLAIM_LEASE_MS = 60_000;

/** Web Push "Topic" header: ≤32 URL-safe chars; replaces undelivered messages with the same topic. */
export function topicFor(tag: string): string | undefined {
  if (!tag) return undefined;
  return createHash('sha256').update(tag).digest('base64url').slice(0, 32);
}

/** How to treat a push-service failure. 404/410 mean the subscription is permanently gone. */
export function classifyPushFailure(statusCode: number | null): {
  gone: boolean;
  retryable: boolean;
} {
  if (statusCode === 404 || statusCode === 410) return { gone: true, retryable: false };
  return { gone: false, retryable: statusCode === null || statusCode === 429 || statusCode >= 500 };
}

/** Exponential backoff between delivery attempts: 60s, 120s, 240s… */
export function retryDelayMs(attempts: number): number {
  return 30_000 * 2 ** Math.max(1, attempts);
}

/** Body of the daily "missed sessions" reminder. */
export function missedDigestBody(titles: string[]): string {
  if (titles.length === 0) return '';
  if (titles.length === 1) return `${titles[0]} needs a decision: done, skip, or a new slot?`;
  return `${titles[0]} and ${titles.length - 1} more need a decision.`;
}
