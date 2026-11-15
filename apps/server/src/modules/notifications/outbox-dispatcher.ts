import type { Types } from 'mongoose';
import type { Env } from '../../config/env';
import {
  Activity,
  ActivityOccurrence,
  JournalEntry,
  Notification,
  PushSubscriptionModel,
  type INotification,
  type IPushSubscription,
  type NotificationStatus,
} from '../../db/models';
import { logger } from '../../lib/logger';
import { getProfile, notificationPrefs } from '../profile/profile.service';
import { listNeedingDecision } from '../schedule/occurrences.service';
import {
  CLAIM_LEASE_MS,
  classifyPushFailure,
  MAX_ATTEMPTS,
  missedDigestBody,
  retryDelayMs,
  topicFor,
} from './delivery-policy';
import { buildPushPayload } from './payload';
import { PushSendError, type PushSender } from './push-sender';

interface SendOutcome {
  ok: boolean;
  retryable: boolean;
  statusCode: number | null;
  error: string | null;
  subscriptionId: Types.ObjectId;
}

/**
 * Sends due outbox rows over Web Push.
 *
 * - Rows are claimed atomically (status + lease), so several workers can run safely.
 * - Conditions are re-checked at send time (e.g. don't send "starts now" for a session that was
 *   already completed), and stale rows expire instead of arriving hours late after downtime.
 * - Retryable failures back off; subscriptions the push service reports as gone are removed.
 */
export class OutboxDispatcher {
  constructor(
    private readonly env: Env,
    private readonly push: PushSender,
  ) {}

  /** Claim and send every due notification. Safe to run concurrently in several processes. */
  async dispatchDue(now = new Date(), maxBatch = 200): Promise<number> {
    let processed = 0;
    while (processed < maxBatch) {
      const doc = await Notification.findOneAndUpdate(
        {
          status: { $in: ['pending', 'processing'] },
          fireAt: { $lte: now },
          $or: [{ lockedUntil: null }, { lockedUntil: { $lte: now } }],
        },
        {
          $set: { status: 'processing', lockedUntil: new Date(now.getTime() + CLAIM_LEASE_MS) },
          $inc: { attempts: 1 },
        },
        { sort: { fireAt: 1 }, returnDocument: 'after' },
      ).lean<INotification>();
      if (!doc) break;
      processed++;
      try {
        await this.process(doc, now);
      } catch (err) {
        logger.error({ err, notificationId: doc._id }, 'Notification processing failed');
        await this.finish(doc._id, 'failed', 'internal_error');
      }
    }
    return processed;
  }

  /** Re-check, send and record the outcome of one claimed row. */
  async process(doc: INotification, now: Date) {
    const lateness = (now.getTime() - doc.fireAt.getTime()) / 1000;
    if (lateness > doc.maxLatenessSeconds) return this.finish(doc._id, 'expired', 'too_late');

    const { title } = doc;
    let { body } = doc;
    if (doc.condition === 'occurrence_pending' && doc.activityId && doc.occurrenceDate) {
      const activity = await Activity.findOne({ _id: doc.activityId, userId: doc.userId })
        .select({ archived: 1 })
        .lean();
      if (!activity || activity.archived) {
        return this.finish(doc._id, 'skipped_condition', 'activity_removed');
      }
      const state = await ActivityOccurrence.findOne({
        userId: doc.userId,
        activityId: doc.activityId,
        date: doc.occurrenceDate,
      })
        .select({ status: 1 })
        .lean();
      if (state && state.status !== 'pending') {
        return this.finish(doc._id, 'skipped_condition', `occurrence_${state.status}`);
      }
    }
    if (doc.condition === 'journal_pending' && doc.occurrenceDate) {
      const done = await JournalEntry.exists({
        userId: doc.userId,
        type: 'evening',
        date: doc.occurrenceDate,
        completedAt: { $ne: null },
      });
      if (done) return this.finish(doc._id, 'skipped_condition', 'journal_done');
    }
    if (doc.condition === 'missed_exists') {
      const { occurrences: missed } = await listNeedingDecision(doc.userId, now.getTime());
      if (missed.length === 0) return this.finish(doc._id, 'skipped_condition', 'nothing_missed');
      body = missedDigestBody(missed.map((o) => o.title));
    }

    const subs = await PushSubscriptionModel.find({ userId: doc.userId }).lean<
      IPushSubscription[]
    >();
    if (subs.length === 0) return this.finish(doc._id, 'no_subscription', null, { title, body });
    if (!this.push.enabled) return this.finish(doc._id, 'failed', 'push_disabled', { title, body });

    const profile = await getProfile(doc.userId);
    const payload = JSON.stringify(
      buildPushPayload(
        { ...doc, title, body },
        this.env,
        notificationPrefs(profile).defaultSnoozeMinutes,
      ),
    );
    const ttlSeconds = Math.max(60, Math.round(doc.ttlSeconds - Math.max(0, lateness)));
    const topic = doc.activityId ? topicFor(doc.tag) : undefined;
    const outcomes = await Promise.all(
      subs.map((sub) => this.sendTo(sub, payload, { ttlSeconds, urgency: doc.urgency, topic })),
    );
    const results = outcomes.map((o) => ({
      subscriptionId: o.subscriptionId,
      statusCode: o.statusCode,
      error: o.error,
      at: now,
    }));

    if (outcomes.some((o) => o.ok)) {
      return this.finish(doc._id, 'sent', null, { sentAt: now, results, title, body });
    }
    if (outcomes.some((o) => o.retryable) && doc.attempts < MAX_ATTEMPTS) {
      await Notification.updateOne(
        { _id: doc._id },
        {
          $set: {
            status: 'pending',
            statusReason: 'retrying',
            lockedUntil: new Date(now.getTime() + retryDelayMs(doc.attempts)),
            results,
          },
        },
      );
      return;
    }
    const allGone = outcomes.every((o) => o.error === 'subscription_gone');
    return this.finish(
      doc._id,
      allGone ? 'no_subscription' : 'failed',
      allGone ? 'subscriptions_expired' : 'delivery_failed',
      { results },
    );
  }

  private async finish(
    id: Types.ObjectId,
    status: NotificationStatus,
    reason: string | null,
    extra: Record<string, unknown> = {},
  ) {
    await Notification.updateOne(
      { _id: id },
      { $set: { status, statusReason: reason, lockedUntil: null, ...extra } },
    );
  }

  private async sendTo(
    sub: IPushSubscription,
    payload: string,
    options: { ttlSeconds: number; urgency: INotification['urgency']; topic?: string },
  ): Promise<SendOutcome> {
    try {
      const { statusCode } = await this.push.send(sub, payload, options);
      await PushSubscriptionModel.updateOne(
        { _id: sub._id },
        { $set: { lastSuccessAt: new Date(), failureCount: 0 } },
      );
      return { ok: true, retryable: false, statusCode, error: null, subscriptionId: sub._id };
    } catch (err) {
      const statusCode = err instanceof PushSendError ? err.statusCode : null;
      const { gone, retryable } = classifyPushFailure(statusCode);
      if (gone) {
        // The browser/OS revoked this subscription (app removed, permission reset…).
        await PushSubscriptionModel.deleteOne({ _id: sub._id });
        return {
          ok: false,
          retryable: false,
          statusCode,
          error: 'subscription_gone',
          subscriptionId: sub._id,
        };
      }
      await PushSubscriptionModel.updateOne(
        { _id: sub._id },
        { $set: { lastFailureAt: new Date() }, $inc: { failureCount: 1 } },
      );
      if (statusCode === 401 || statusCode === 403) {
        logger.warn(
          { statusCode },
          'Push service rejected VAPID credentials — check VAPID keys/subject',
        );
      }
      return {
        ok: false,
        retryable,
        statusCode,
        error: (err as Error).message.slice(0, 300),
        subscriptionId: sub._id,
      };
    }
  }
}
