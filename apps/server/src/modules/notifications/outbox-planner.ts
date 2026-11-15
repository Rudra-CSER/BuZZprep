import { addDays, logicalDateOf, planNotifications } from '@buzzprep/shared';
import type { AnyBulkWriteOperation, Types } from 'mongoose';
import { Notification, Plan, type INotification, type NotificationStatus } from '../../db/models';
import { oid } from '../../lib/serialize';
import { getProfile, notificationPrefs, timeContext } from '../profile/profile.service';
import { loadEnabledRules } from '../reminders/reminders.service';
import { loadAgenda } from '../schedule/agenda.service';
import { PURGE_AFTER_MS } from './delivery-policy';

/**
 * Plan a user's reminders for [now, now + horizon] into the outbox.
 *
 * Idempotent: rows are keyed by a deterministic `dedupeKey`, so re-planning never duplicates.
 * Pending rows are refreshed (title, quiet hours…), and pending rows that are no longer planned
 * (session moved or deleted, rule changed) are cancelled. Sent rows are never touched.
 */
export async function planUserOutbox(
  userId: Types.ObjectId | string,
  horizonHours: number,
  now = Date.now(),
): Promise<{ planned: number; cancelled: number }> {
  const uid = oid(userId);
  const profile = await getProfile(uid);
  if (!profile.onboardingCompletedAt) return { planned: 0, cancelled: 0 };
  const ctx = timeContext(profile);
  const from = new Date(now);
  const to = new Date(now + horizonHours * 3_600_000);
  const firstDay = addDays(logicalDateOf(from, ctx), -1);
  const lastDay = addDays(logicalDateOf(to, ctx), 1);

  const [occurrences, reminders, plan] = await Promise.all([
    loadAgenda(uid, profile, firstDay, lastDay),
    loadEnabledRules(uid),
    Plan.findOne({ userId: uid, status: 'active' }).lean(),
  ]);

  const planned = planNotifications({
    reminders,
    occurrences,
    milestones: (plan?.milestones ?? []).map((m) => ({
      id: m._id.toHexString(),
      title: m.title,
      dueDate: m.dueDate,
      completed: m.completed,
    })),
    prefs: notificationPrefs(profile),
    from: from.toISOString(),
    to: to.toISOString(),
    ctx,
  });

  const keys = planned.map((p) => p.dedupeKey);
  const existing = await Notification.find({ userId: uid, dedupeKey: { $in: keys } })
    .select({ dedupeKey: 1, status: 1 })
    .lean();
  const byKey = new Map(existing.map((e) => [e.dedupeKey, e]));

  const ops: AnyBulkWriteOperation<INotification>[] = [];
  for (const p of planned) {
    const status: NotificationStatus = p.suppressedReason ? 'suppressed' : 'pending';
    const fields = {
      kind: p.kind,
      title: p.title,
      body: p.body,
      url: p.url,
      tag: p.tag,
      condition: p.condition,
      urgency: p.urgency,
      ttlSeconds: p.ttlSeconds,
      maxLatenessSeconds: p.maxLatenessSeconds,
      statusReason: p.suppressedReason,
    };
    const ex = byKey.get(p.dedupeKey);
    if (!ex) {
      const fireAt = new Date(p.fireAt);
      ops.push({
        updateOne: {
          filter: { userId: uid, dedupeKey: p.dedupeKey },
          update: {
            $setOnInsert: {
              userId: uid,
              source: 'schedule',
              dedupeKey: p.dedupeKey,
              reminderId: oid(p.reminderId),
              activityId: p.activityId ? oid(p.activityId) : null,
              occurrenceDate: p.occurrenceDate,
              fireAt,
              purgeAt: new Date(fireAt.getTime() + PURGE_AFTER_MS),
              status,
              attempts: 0,
              results: [],
              ...fields,
            },
          },
          upsert: true,
        },
      });
    } else if (ex.status === 'pending' || ex.status === 'suppressed') {
      ops.push({
        updateOne: {
          filter: { _id: ex._id, status: { $in: ['pending', 'suppressed'] } },
          update: { $set: { ...fields, status } },
        },
      });
    }
  }
  if (ops.length > 0) await Notification.bulkWrite(ops, { ordered: false });

  const cancelled = await Notification.updateMany(
    {
      userId: uid,
      source: 'schedule',
      status: { $in: ['pending', 'suppressed'] },
      fireAt: { $gte: from, $lt: to },
      dedupeKey: { $nin: keys },
    },
    { $set: { status: 'cancelled', statusReason: 'obsolete' } },
  );
  return { planned: planned.length, cancelled: cancelled.modifiedCount };
}
