import {
  CATEGORY_META,
  describeRecurrence,
  formatTime,
  parseTime,
  type ActivityCreateInput,
  type ActivityUpdateInput,
} from '@buzzprep/shared';
import type { Types } from 'mongoose';
import {
  Activity,
  LearningTrack,
  Reminder,
  ScheduleTemplate,
  type IActivity,
  type IReminder,
  type IScheduleTemplate,
} from '../../db/models';
import { badRequest, notFound } from '../../lib/errors';
import { toApi } from '../../lib/serialize';
import { presetsFrom, syncPresets } from './activity-reminders';
import { getActiveTemplate } from './schedules.service';

/** API shape: the activity plus its end time, a readable repeat rule and reminder presets. */
function serializeActivity(a: IActivity, reminders: IReminder[]) {
  return {
    ...toApi<Record<string, unknown>>(a),
    endTime: formatTime(parseTime(a.startTime) + a.durationMinutes),
    recurrenceLabel: describeRecurrence(a.recurrence),
    reminders: presetsFrom(reminders.filter((r) => r.activityId?.equals(a._id))),
  };
}

async function remindersOf(userId: Types.ObjectId, activityIds: Types.ObjectId[]) {
  return Reminder.find({ userId, activityId: { $in: activityIds } }).lean<IReminder[]>();
}

async function assertTrack(userId: Types.ObjectId, trackId: string | null | undefined) {
  if (!trackId) return null;
  const track = await LearningTrack.findOne({ _id: trackId, userId }).select({ _id: 1 }).lean();
  if (!track) throw badRequest('Unknown learning track');
  return track._id;
}

/** Activities of a routine (the active one unless `scheduleId` is given), by start time. */
export async function listActivities(userId: Types.ObjectId, scheduleId?: Types.ObjectId) {
  const templateId = scheduleId ?? (await getActiveTemplate(userId))?._id;
  if (!templateId) return [];
  const activities = await Activity.find({ userId, templateId, archived: false })
    .sort({ startTime: 1 })
    .lean<IActivity[]>();
  const reminders = await remindersOf(
    userId,
    activities.map((a) => a._id),
  );
  return activities.map((a) => serializeActivity(a, reminders));
}

export async function getActivity(userId: Types.ObjectId, id: Types.ObjectId) {
  const a = await Activity.findOne({ _id: id, userId }).lean<IActivity>();
  if (!a) throw notFound('Activity');
  return serializeActivity(a, await remindersOf(userId, [a._id]));
}

/** Add an activity to a routine; creates "My routine" if the user has none yet. */
export async function createActivity(userId: Types.ObjectId, input: ActivityCreateInput) {
  const { scheduleId, reminders: presets, ...fields } = input;
  let template = scheduleId
    ? await ScheduleTemplate.findOne({ _id: scheduleId, userId }).lean<IScheduleTemplate>()
    : await getActiveTemplate(userId);
  if (scheduleId && !template) throw notFound('Schedule');
  if (!template) {
    template = (
      await ScheduleTemplate.create({ userId, name: 'My routine', isActive: true })
    ).toObject();
  }
  const trackId = await assertTrack(userId, fields.trackId);
  const created = await Activity.create({
    ...fields,
    userId,
    templateId: template._id,
    trackId,
    blocking: fields.blocking ?? CATEGORY_META[fields.category].defaultBlocking,
  });
  if (presets) await syncPresets(userId, created._id, presets);
  return serializeActivity(created.toObject(), await remindersOf(userId, [created._id]));
}

export async function updateActivity(
  userId: Types.ObjectId,
  id: Types.ObjectId,
  input: ActivityUpdateInput,
) {
  const { reminders: presets, ...patch } = input;
  const $set: Record<string, unknown> = { ...patch };
  if ('trackId' in patch) $set.trackId = await assertTrack(userId, patch.trackId);
  const a = await Activity.findOneAndUpdate(
    { _id: id, userId, archived: false },
    { $set },
    { returnDocument: 'after' },
  ).lean<IActivity>();
  if (!a) throw notFound('Activity');
  if (presets) await syncPresets(userId, a._id, presets);
  return serializeActivity(a, await remindersOf(userId, [a._id]));
}

/** Activities are archived, not deleted, so past sessions keep their history. */
export async function archiveActivity(userId: Types.ObjectId, id: Types.ObjectId) {
  const result = await Activity.updateOne({ _id: id, userId }, { $set: { archived: true } });
  if (result.matchedCount === 0) throw notFound('Activity');
  await Reminder.deleteMany({ userId, activityId: id });
}
