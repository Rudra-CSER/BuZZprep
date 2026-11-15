import type { ReminderInput, ReminderPatch, ReminderRule } from '@buzzprep/shared';
import type { Types } from 'mongoose';
import { Activity, Reminder, type IReminder } from '../../db/models';
import { badRequest, notFound } from '../../lib/errors';
import { toApi } from '../../lib/serialize';

/** Map a stored reminder to the rule format the shared notification planner works with. */
export function toReminderRule(r: IReminder): ReminderRule {
  return {
    id: r._id.toHexString(),
    kind: r.kind,
    anchor: r.anchor,
    activityId: r.activityId ? r.activityId.toHexString() : null,
    offsetMinutes: r.offsetMinutes,
    time: r.time,
    recurrence: r.recurrence,
    daysBefore: r.daysBefore,
    title: r.title,
    body: r.body,
    enabled: r.enabled,
    bypassQuietHours: r.bypassQuietHours,
  };
}

/** Enabled reminder rules for the notification planner. */
export async function loadEnabledRules(userId: Types.ObjectId): Promise<ReminderRule[]> {
  const reminders = await Reminder.find({ userId, enabled: true }).lean<IReminder[]>();
  return reminders.map(toReminderRule);
}

async function assertActivity(userId: Types.ObjectId, activityId: string | null | undefined) {
  if (!activityId) return null;
  const a = await Activity.findOne({ _id: activityId, userId, archived: false })
    .select({ _id: 1 })
    .lean();
  if (!a) throw badRequest('Unknown activity');
  return a._id;
}

/** Reminder rules with a summary of their activity. Rules of removed activities are hidden. */
export async function listReminders(userId: Types.ObjectId) {
  const reminders = await Reminder.find({ userId }).sort({ createdAt: 1 }).lean<IReminder[]>();
  const activities = await Activity.find({
    userId,
    _id: { $in: reminders.flatMap((r) => (r.activityId ? [r.activityId] : [])) },
  })
    .select({
      title: 1,
      startTime: 1,
      durationMinutes: 1,
      category: 1,
      archived: 1,
      templateId: 1,
    })
    .lean();
  return reminders
    .map((rem) => {
      const activity = rem.activityId
        ? activities.find((a) => a._id.equals(rem.activityId!))
        : null;
      if (rem.activityId && (!activity || activity.archived)) return null;
      return {
        ...toApi<Record<string, unknown>>(rem),
        activity: activity ? toApi(activity) : null,
      };
    })
    .filter(Boolean);
}

export async function createReminder(userId: Types.ObjectId, input: ReminderInput) {
  const activityId = await assertActivity(userId, input.activityId);
  const reminder = await Reminder.create({ ...input, userId, activityId });
  return toApi(reminder.toObject());
}

export async function updateReminder(
  userId: Types.ObjectId,
  id: Types.ObjectId,
  patch: ReminderPatch,
) {
  const $set: Record<string, unknown> = { ...patch };
  if ('activityId' in patch) $set.activityId = await assertActivity(userId, patch.activityId);
  const reminder = await Reminder.findOneAndUpdate(
    { _id: id, userId },
    { $set },
    { returnDocument: 'after' },
  ).lean<IReminder>();
  if (!reminder) throw notFound('Reminder');
  return toApi(reminder);
}

export async function deleteReminder(userId: Types.ObjectId, id: Types.ObjectId): Promise<void> {
  const result = await Reminder.deleteOne({ _id: id, userId });
  if (result.deletedCount === 0) throw notFound('Reminder');
}
