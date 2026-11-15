import type { ScheduleTemplateInput } from '@buzzprep/shared';
import { Types } from 'mongoose';
import {
  Activity,
  Reminder,
  ScheduleTemplate,
  type IActivity,
  type IReminder,
  type IScheduleTemplate,
} from '../../db/models';
import { conflict, notFound } from '../../lib/errors';
import { toApi } from '../../lib/serialize';

/** The routine currently in use (a user has at most one active schedule). */
export async function getActiveTemplate(userId: Types.ObjectId) {
  return ScheduleTemplate.findOne({ userId, isActive: true }).lean<IScheduleTemplate>();
}

/** Routines with the number of activities in each, active first. */
export async function listSchedules(userId: Types.ObjectId) {
  const templates = await ScheduleTemplate.find({ userId })
    .sort({ isActive: -1, updatedAt: -1 })
    .lean();
  const counts = await Activity.aggregate<{ _id: Types.ObjectId; n: number }>([
    { $match: { userId, archived: false } },
    { $group: { _id: '$templateId', n: { $sum: 1 } } },
  ]);
  return templates.map((t) => ({
    ...toApi<Record<string, unknown>>(t),
    activityCount: counts.find((c) => c._id.equals(t._id))?.n ?? 0,
  }));
}

/** A new routine is active only if the user has none yet. */
export async function createSchedule(userId: Types.ObjectId, input: ScheduleTemplateInput) {
  const hasActive = await ScheduleTemplate.exists({ userId, isActive: true });
  const t = await ScheduleTemplate.create({ userId, ...input, isActive: !hasActive });
  return toApi(t.toObject());
}

export async function updateSchedule(
  userId: Types.ObjectId,
  id: Types.ObjectId,
  input: Partial<ScheduleTemplateInput>,
) {
  const t = await ScheduleTemplate.findOneAndUpdate(
    { _id: id, userId },
    { $set: input },
    { returnDocument: 'after' },
  ).lean<IScheduleTemplate>();
  if (!t) throw notFound('Schedule');
  return toApi(t);
}

export async function activateSchedule(userId: Types.ObjectId, id: Types.ObjectId) {
  if (!(await ScheduleTemplate.exists({ _id: id, userId }))) throw notFound('Schedule');
  await ScheduleTemplate.updateMany({ userId, isActive: true }, { $set: { isActive: false } });
  await ScheduleTemplate.updateOne({ _id: id }, { $set: { isActive: true } });
}

/** Copy a routine with its activities and their reminders. The copy starts inactive. */
export async function duplicateSchedule(userId: Types.ObjectId, id: Types.ObjectId) {
  const src = await ScheduleTemplate.findOne({ _id: id, userId }).lean<IScheduleTemplate>();
  if (!src) throw notFound('Schedule');
  const copy = await ScheduleTemplate.create({
    userId,
    name: `${src.name} (copy)`.slice(0, 80),
    description: src.description,
    isActive: false,
  });
  const activities = await Activity.find({ userId, templateId: src._id, archived: false }).lean<
    IActivity[]
  >();
  const idMap = new Map<string, Types.ObjectId>();
  const clones = activities.map(({ _id, createdAt: _c, updatedAt: _u, ...rest }) => {
    const cloneId = new Types.ObjectId();
    idMap.set(_id.toHexString(), cloneId);
    return { ...rest, _id: cloneId, templateId: copy._id };
  });
  if (clones.length > 0) await Activity.insertMany(clones);
  const reminders = await Reminder.find({
    userId,
    activityId: { $in: activities.map((a) => a._id) },
  }).lean<IReminder[]>();
  const reminderClones = reminders.map(({ _id: _id, createdAt: _c, updatedAt: _u, ...rest }) => ({
    ...rest,
    activityId: idMap.get(rest.activityId!.toHexString())!,
  }));
  if (reminderClones.length > 0) await Reminder.insertMany(reminderClones);
  return toApi(copy.toObject());
}

/**
 * Delete an inactive routine. Its activities are archived (not deleted) so completion history
 * stays intact; their reminders are removed.
 */
export async function deleteSchedule(userId: Types.ObjectId, id: Types.ObjectId) {
  const t = await ScheduleTemplate.findOne({ _id: id, userId }).lean<IScheduleTemplate>();
  if (!t) throw notFound('Schedule');
  if (t.isActive) throw conflict('Activate another schedule before deleting this one.');
  const ids = (await Activity.find({ userId, templateId: t._id }).select({ _id: 1 }).lean()).map(
    (a) => a._id,
  );
  await Reminder.deleteMany({ userId, activityId: { $in: ids } });
  await Activity.updateMany({ userId, templateId: t._id }, { $set: { archived: true } });
  await ScheduleTemplate.deleteOne({ _id: t._id });
}
