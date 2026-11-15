import type { NotificationEventInput } from '@buzzprep/shared';
import { Types } from 'mongoose';
import type { Env } from '../../config/env';
import {
  Notification,
  PushSubscriptionModel,
  UserProfile,
  type INotification,
} from '../../db/models';
import { verifyNotificationToken } from '../../lib/crypto';
import { badRequest, notFound, unauthorized, unavailable } from '../../lib/errors';
import { logger } from '../../lib/logger';
import { getProfile, notificationPrefs } from '../profile/profile.service';
import { updateOccurrence } from '../schedule/occurrences.service';
import { CLAIM_LEASE_MS, PURGE_AFTER_MS } from './delivery-policy';
import { OutboxDispatcher } from './outbox-dispatcher';
import { planUserOutbox } from './outbox-planner';
import type { PushSender } from './push-sender';

type SnoozeSource = Pick<
  INotification,
  | '_id'
  | 'userId'
  | 'dedupeKey'
  | 'kind'
  | 'title'
  | 'body'
  | 'url'
  | 'tag'
  | 'condition'
  | 'activityId'
  | 'occurrenceDate'
  | 'reminderId'
>;

/**
 * Durable, server-side reminder delivery.
 *
 *   planUserOutbox ─▶ notifications (outbox, MongoDB) ─▶ OutboxDispatcher ─▶ Web Push ─▶ device
 *
 * The outbox is the source of truth: every planned reminder is a row with a status, so delivery
 * can be tracked, retried, skipped or snoozed, and nothing depends on a browser timer. This class
 * ties planning and dispatch together and handles what users do with a notification.
 */
export class NotificationService {
  private readonly timers = new Map<string, NodeJS.Timeout>();
  private readonly dispatcher: OutboxDispatcher;

  constructor(
    private readonly env: Env,
    private readonly push: PushSender,
  ) {
    this.dispatcher = new OutboxDispatcher(env, push);
  }

  get pushEnabled() {
    return this.push.enabled;
  }

  get publicKey() {
    return this.push.publicKey;
  }

  // ── Planning ─────────────────────────────────────────────────────────────

  /** Debounced re-plan after a user changes something that affects reminders. */
  queueReconcile(userId: Types.ObjectId | string, delayMs = 1500) {
    const key = userId.toString();
    clearTimeout(this.timers.get(key));
    const timer = setTimeout(() => {
      this.timers.delete(key);
      this.reconcileUser(key).catch((err) =>
        logger.error({ err, userId: key }, 'Reconcile failed'),
      );
    }, delayMs);
    timer.unref?.();
    this.timers.set(key, timer);
  }

  /** Run queued re-plans immediately (tests, graceful shutdown). */
  async flush() {
    const keys = [...this.timers.keys()];
    for (const key of keys) {
      clearTimeout(this.timers.get(key));
      this.timers.delete(key);
    }
    await Promise.all(keys.map((k) => this.reconcileUser(k)));
  }

  stop() {
    for (const t of this.timers.values()) clearTimeout(t);
    this.timers.clear();
  }

  reconcileUser(userId: Types.ObjectId | string, now = Date.now()) {
    return planUserOutbox(userId, this.env.NOTIFICATION_HORIZON_HOURS, now);
  }

  /** Re-plan every onboarded user (periodic safety net; mutations re-plan immediately). */
  async reconcileAll(now = Date.now()) {
    let users = 0;
    const cursor = UserProfile.find({ onboardingCompletedAt: { $ne: null } })
      .select({ userId: 1 })
      .lean()
      .cursor();
    for await (const p of cursor) {
      try {
        await this.reconcileUser(p.userId, now);
        users++;
      } catch (err) {
        logger.error({ err, userId: p.userId }, 'Reconcile failed');
      }
    }
    return users;
  }

  // ── Delivery ─────────────────────────────────────────────────────────────

  dispatchDue(now = new Date(), maxBatch = 200) {
    return this.dispatcher.dispatchDue(now, maxBatch);
  }

  process(doc: INotification, now: Date) {
    return this.dispatcher.process(doc, now);
  }

  /** Send a real push right now to every device of the user (setup verification). */
  async sendTest(userId: Types.ObjectId) {
    if (!this.push.enabled) {
      throw unavailable('Push is not configured on this server yet (VAPID keys are missing).');
    }
    const count = await PushSubscriptionModel.countDocuments({ userId });
    if (count === 0) throw badRequest('No device is subscribed yet. Enable notifications first.');
    const now = new Date();
    const doc = await Notification.create({
      userId,
      source: 'test',
      dedupeKey: `test:${now.getTime()}:${Math.random().toString(36).slice(2, 8)}`,
      kind: 'custom',
      fireAt: now,
      title: 'Test notification',
      body: 'If you can read this, reminders can reach this device.',
      url: '/profile/notifications',
      tag: 'test',
      urgency: 'high',
      ttlSeconds: 300,
      maxLatenessSeconds: 300,
      status: 'processing',
      attempts: 1,
      lockedUntil: new Date(now.getTime() + CLAIM_LEASE_MS),
      purgeAt: new Date(now.getTime() + PURGE_AFTER_MS),
    });
    await this.process(doc.toObject() as INotification, now);
    return Notification.findById(doc._id).lean<INotification>();
  }

  // ── What users do with a notification ────────────────────────────────────

  /** Send the same reminder again in `minutes`. */
  async snooze(n: SnoozeSource, minutes: number, now = new Date()) {
    const fireAt = new Date(now.getTime() + minutes * 60_000);
    const created = await Notification.create({
      userId: n.userId,
      source: 'snooze',
      dedupeKey: `${n.dedupeKey}:snooze:${now.getTime()}`,
      reminderId: n.reminderId,
      kind: n.kind,
      activityId: n.activityId,
      occurrenceDate: n.occurrenceDate,
      fireAt,
      title: n.title,
      body: n.body.startsWith('Snoozed') ? n.body : `Snoozed ${minutes} min · ${n.body}`,
      url: n.url,
      tag: n.tag,
      condition: n.condition,
      urgency: 'high',
      ttlSeconds: 15 * 60,
      maxLatenessSeconds: 15 * 60,
      status: 'pending',
      purgeAt: new Date(fireAt.getTime() + PURGE_AFTER_MS),
    });
    await Notification.updateOne({ _id: n._id }, { $set: { actionTaken: 'snooze' } });
    return created;
  }

  /** Delivery receipts and notification actions, authorised by session or by the signed token. */
  async handleEvent(id: string, input: NotificationEventInput, authUserId?: Types.ObjectId) {
    if (!Types.ObjectId.isValid(id)) throw notFound('Notification');
    const n = await Notification.findById(id).lean<INotification>();
    if (!n) throw notFound('Notification');
    if (authUserId) {
      if (!n.userId.equals(authUserId)) throw notFound('Notification');
    } else if (
      !input.token ||
      !verifyNotificationToken(this.env.SESSION_SECRET, input.token, id, n.userId.toHexString())
    ) {
      throw unauthorized('Invalid or expired notification token');
    }

    const now = new Date();
    switch (input.type) {
      case 'delivered':
        await Notification.updateOne(
          { _id: n._id, deliveredAt: null },
          { $set: { deliveredAt: now } },
        );
        return { ok: true };
      case 'clicked':
        await Notification.updateOne({ _id: n._id, clickedAt: null }, { $set: { clickedAt: now } });
        return { ok: true };
      case 'action': {
        const action = input.action ?? 'dismiss';
        if (action === 'snooze') {
          const profile = await getProfile(n.userId);
          const minutes = input.snoozeMinutes ?? notificationPrefs(profile).defaultSnoozeMinutes;
          const snoozed = await this.snooze(n, minutes, now);
          return { ok: true, snoozedUntil: snoozed.fireAt.toISOString() };
        }
        if ((action === 'complete' || action === 'skip') && n.activityId && n.occurrenceDate) {
          await updateOccurrence(n.userId, n.activityId, n.occurrenceDate, {
            status: action === 'complete' ? 'completed' : 'skipped',
          });
          this.queueReconcile(n.userId, 200);
        }
        await Notification.updateOne(
          { _id: n._id },
          { $set: { actionTaken: action, clickedAt: n.clickedAt ?? now } },
        );
        return { ok: true };
      }
    }
  }
}
