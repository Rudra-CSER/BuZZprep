import { z } from 'zod';

export const pushSubscriptionSchema = z.object({
  endpoint: z
    .string()
    .max(2048)
    .refine(
      (v) => {
        try {
          return new URL(v).protocol === 'https:';
        } catch {
          return false;
        }
      },
      { message: 'Push endpoints must be https URLs' },
    ),
  expirationTime: z.number().nullish(),
  keys: z.object({
    p256dh: z.string().min(16).max(256),
    auth: z.string().min(8).max(64),
  }),
  deviceLabel: z.string().trim().max(80).optional(),
});
export type PushSubscriptionInput = z.infer<typeof pushSubscriptionSchema>;

export const NOTIFICATION_EVENT_TYPES = ['delivered', 'clicked', 'action'] as const;
export const NOTIFICATION_ACTIONS = ['snooze', 'complete', 'skip', 'dismiss'] as const;
export type NotificationAction = (typeof NOTIFICATION_ACTIONS)[number];

export const notificationEventSchema = z.object({
  type: z.enum(NOTIFICATION_EVENT_TYPES),
  action: z.enum(NOTIFICATION_ACTIONS).optional(),
  snoozeMinutes: z.number().int().min(1).max(240).optional(),
  /** Signed token from the push payload; lets the service worker report without a session. */
  token: z.string().max(512).optional(),
});
export type NotificationEventInput = z.infer<typeof notificationEventSchema>;

export const snoozeSchema = z.object({
  minutes: z.number().int().min(1).max(240),
});

/** Payload carried in `notification.data` of every push this app sends. */
export interface PushPayloadData {
  notificationId: string;
  kind: string;
  url: string;
  token: string;
  activityId?: string | null;
  occurrenceDate?: string | null;
}
