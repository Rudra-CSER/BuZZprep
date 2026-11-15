import { Schema, model, type Types } from 'mongoose';

export interface IPushSubscription {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  endpoint: string;
  keys: { p256dh: string; auth: string };
  expirationTime: number | null;
  platform: 'ios' | 'android' | 'desktop' | 'unknown';
  deviceLabel: string | null;
  userAgent: string | null;
  lastSuccessAt: Date | null;
  lastFailureAt: Date | null;
  failureCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const subscriptionSchema = new Schema<IPushSubscription>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    endpoint: { type: String, required: true, maxlength: 2048 },
    keys: {
      p256dh: { type: String, required: true },
      auth: { type: String, required: true },
    },
    expirationTime: { type: Number, default: null },
    platform: { type: String, enum: ['ios', 'android', 'desktop', 'unknown'], default: 'unknown' },
    deviceLabel: { type: String, default: null, maxlength: 80 },
    userAgent: { type: String, default: null, maxlength: 300 },
    lastSuccessAt: { type: Date, default: null },
    lastFailureAt: { type: Date, default: null },
    failureCount: { type: Number, default: 0 },
  },
  { timestamps: true },
);
subscriptionSchema.index({ endpoint: 1 }, { unique: true });
subscriptionSchema.index({ userId: 1 });

export const PushSubscriptionModel = model<IPushSubscription>(
  'PushSubscription',
  subscriptionSchema,
);
