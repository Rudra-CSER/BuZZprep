import type { ReminderKind } from '@buzzprep/shared';
import { Schema, model, type Types } from 'mongoose';

export const NOTIFICATION_STATUSES = [
  'pending',
  'processing',
  'sent',
  'failed',
  'cancelled',
  'suppressed',
  'skipped_condition',
  'expired',
  'no_subscription',
] as const;
export type NotificationStatus = (typeof NOTIFICATION_STATUSES)[number];

export interface DeliveryResult {
  subscriptionId: Types.ObjectId;
  statusCode: number | null;
  error: string | null;
  at: Date;
}

/** The durable outbox: one row per planned notification, plus its delivery history. */
export interface INotification {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  source: 'schedule' | 'snooze' | 'test';
  dedupeKey: string;
  reminderId: Types.ObjectId | null;
  kind: ReminderKind;
  activityId: Types.ObjectId | null;
  occurrenceDate: string | null;
  fireAt: Date;
  title: string;
  body: string;
  url: string;
  tag: string;
  condition: 'occurrence_pending' | 'missed_exists' | null;
  urgency: 'high' | 'normal' | 'low';
  ttlSeconds: number;
  maxLatenessSeconds: number;
  status: NotificationStatus;
  statusReason: string | null;
  attempts: number;
  lockedUntil: Date | null;
  sentAt: Date | null;
  deliveredAt: Date | null;
  clickedAt: Date | null;
  actionTaken: string | null;
  results: DeliveryResult[];
  purgeAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    source: { type: String, enum: ['schedule', 'snooze', 'test'], default: 'schedule' },
    dedupeKey: { type: String, required: true },
    reminderId: { type: Schema.Types.ObjectId, ref: 'Reminder', default: null },
    kind: { type: String, required: true },
    activityId: { type: Schema.Types.ObjectId, ref: 'Activity', default: null },
    occurrenceDate: { type: String, default: null },
    fireAt: { type: Date, required: true },
    title: { type: String, required: true },
    body: { type: String, default: '' },
    url: { type: String, default: '/' },
    tag: { type: String, default: '' },
    condition: { type: String, default: null },
    urgency: { type: String, enum: ['high', 'normal', 'low'], default: 'normal' },
    ttlSeconds: { type: Number, default: 900 },
    maxLatenessSeconds: { type: Number, default: 900 },
    status: { type: String, enum: NOTIFICATION_STATUSES, default: 'pending' },
    statusReason: { type: String, default: null },
    attempts: { type: Number, default: 0 },
    lockedUntil: { type: Date, default: null },
    sentAt: { type: Date, default: null },
    deliveredAt: { type: Date, default: null },
    clickedAt: { type: Date, default: null },
    actionTaken: { type: String, default: null },
    results: {
      type: [
        new Schema<DeliveryResult>(
          {
            subscriptionId: { type: Schema.Types.ObjectId },
            statusCode: { type: Number, default: null },
            error: { type: String, default: null },
            at: { type: Date, default: () => new Date() },
          },
          { _id: false },
        ),
      ],
      default: [],
    },
    purgeAt: { type: Date, required: true },
  },
  { timestamps: true },
);
notificationSchema.index({ userId: 1, dedupeKey: 1 }, { unique: true });
notificationSchema.index({ status: 1, fireAt: 1 });
notificationSchema.index({ userId: 1, fireAt: -1 });
notificationSchema.index({ purgeAt: 1 }, { expireAfterSeconds: 0 });

export const Notification = model<INotification>('Notification', notificationSchema);
