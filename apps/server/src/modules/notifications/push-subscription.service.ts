import type { PushSubscriptionInput } from '@buzzprep/shared';
import type { Types } from 'mongoose';
import { PushSubscriptionModel, type IPushSubscription } from '../../db/models';
import { notFound } from '../../lib/errors';

/** Best-effort device type, shown in the device list and used for iOS-specific guidance. */
export function detectPlatform(userAgent: string, endpoint: string): IPushSubscription['platform'] {
  if (/iPhone|iPad|iPod/i.test(userAgent)) return 'ios';
  if (/Android/i.test(userAgent)) return 'android';
  // iPadOS reports a desktop UA; Apple's push host plus touch → treat as iOS.
  if (endpoint.includes('web.push.apple.com') && /Mobile/i.test(userAgent)) return 'ios';
  return userAgent ? 'desktop' : 'unknown';
}

/** API shape of a device: never the endpoint or keys. */
export function publicSubscription(s: IPushSubscription) {
  let host = 'unknown';
  try {
    host = new URL(s.endpoint).host;
  } catch {
    /* ignore */
  }
  return {
    id: s._id.toHexString(),
    platform: s.platform,
    deviceLabel: s.deviceLabel,
    pushService: host,
    createdAt: s.createdAt.toISOString(),
    lastSuccessAt: s.lastSuccessAt?.toISOString() ?? null,
    lastFailureAt: s.lastFailureAt?.toISOString() ?? null,
  };
}

export async function listSubscriptions(userId: Types.ObjectId) {
  const subs = await PushSubscriptionModel.find({ userId })
    .sort({ createdAt: -1 })
    .lean<IPushSubscription[]>();
  return subs.map(publicSubscription);
}

/**
 * Store a device's push subscription. An endpoint identifies one browser install; if it
 * changed hands, the latest user owns it.
 */
export async function saveSubscription(
  userId: Types.ObjectId,
  input: PushSubscriptionInput,
  userAgent: string,
) {
  const sub = await PushSubscriptionModel.findOneAndUpdate(
    { endpoint: input.endpoint },
    {
      $set: {
        userId,
        keys: input.keys,
        expirationTime: input.expirationTime ?? null,
        platform: detectPlatform(userAgent, input.endpoint),
        deviceLabel: input.deviceLabel ?? null,
        userAgent: userAgent.slice(0, 300) || null,
        failureCount: 0,
      },
    },
    { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true },
  ).lean<IPushSubscription>();
  return publicSubscription(sub!);
}

export async function deleteSubscription(userId: Types.ObjectId, id: Types.ObjectId) {
  const result = await PushSubscriptionModel.deleteOne({ _id: id, userId });
  if (result.deletedCount === 0) throw notFound('Subscription');
}

/** Remove this browser's subscription by endpoint (when the user turns reminders off). */
export async function unsubscribeEndpoint(userId: Types.ObjectId, endpoint: string) {
  await PushSubscriptionModel.deleteOne({ endpoint, userId });
}
