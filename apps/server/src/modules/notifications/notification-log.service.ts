import type { Types } from 'mongoose';
import { Notification, type INotification } from '../../db/models';
import { conflict, notFound } from '../../lib/errors';
import { toApi } from '../../lib/serialize';

/** API shape of an outbox row, without delivery internals. */
export const publicNotification = (n: INotification) =>
  toApi<Record<string, unknown>>(n, ['userId', 'dedupeKey', 'results', 'lockedUntil', 'purgeAt']);

/** Reminders whose time has come, newest first, with their delivery status. */
export async function listRecentNotifications(userId: Types.ObjectId, limit: number) {
  const items = await Notification.find({ userId, fireAt: { $lte: new Date() } })
    .sort({ fireAt: -1 })
    .limit(limit)
    .lean<INotification[]>();
  return items.map(publicNotification);
}

/** What will be sent next. */
export async function listUpcomingNotifications(userId: Types.ObjectId, limit: number) {
  const items = await Notification.find({
    userId,
    status: 'pending',
    fireAt: { $gte: new Date() },
  })
    .sort({ fireAt: 1 })
    .limit(limit)
    .lean<INotification[]>();
  return items.map(publicNotification);
}

export async function findUserNotification(userId: Types.ObjectId, id: Types.ObjectId) {
  const n = await Notification.findOne({ _id: id, userId }).lean<INotification>();
  if (!n) throw notFound('Notification');
  return n;
}

/** "Skip this reminder": cancel one pending notification without touching its rule. */
export async function skipNotification(userId: Types.ObjectId, id: Types.ObjectId) {
  const result = await Notification.updateOne(
    { _id: id, userId, status: { $in: ['pending', 'suppressed'] } },
    { $set: { status: 'cancelled', statusReason: 'skipped_by_user' } },
  );
  if (result.matchedCount === 0) throw conflict('That reminder is no longer pending.');
}
