import type { MilestoneInput, PlanPatch } from '@buzzprep/shared';
import type { Types } from 'mongoose';
import { Plan, type IPlan } from '../../db/models';
import { badRequest, notFound } from '../../lib/errors';
import { toApi } from '../../lib/serialize';

export async function listPlans(userId: Types.ObjectId) {
  const plans = await Plan.find({ userId }).sort({ status: 1, createdAt: -1 }).lean();
  return toApi(plans);
}

export async function getActivePlan(userId: Types.ObjectId) {
  const plan = await Plan.findOne({ userId, status: 'active' }).lean();
  return plan ? toApi(plan) : null;
}

export async function updatePlan(userId: Types.ObjectId, id: Types.ObjectId, patch: PlanPatch) {
  const plan = await Plan.findOne({ _id: id, userId });
  if (!plan) throw notFound('Plan');
  const nextStart = patch.startDate ?? plan.startDate;
  const nextDeadline = patch.deadline ?? plan.deadline;
  if (nextDeadline <= nextStart) throw badRequest('The deadline must be after the start date');
  plan.set(patch);
  await plan.save();
  return toApi(plan.toObject());
}

/** Make one plan active; any other active plan is paused. */
export async function activatePlan(userId: Types.ObjectId, id: Types.ObjectId): Promise<void> {
  if (!(await Plan.exists({ _id: id, userId }))) throw notFound('Plan');
  await Plan.updateMany({ userId, status: 'active' }, { $set: { status: 'paused' } });
  await Plan.updateOne({ _id: id }, { $set: { status: 'active' } });
}

export async function addMilestone(
  userId: Types.ObjectId,
  planId: Types.ObjectId,
  input: MilestoneInput,
) {
  const plan = await Plan.findOneAndUpdate(
    { _id: planId, userId },
    { $push: { milestones: { ...input, completedAt: input.completed ? new Date() : null } } },
    { returnDocument: 'after' },
  ).lean<IPlan>();
  if (!plan) throw notFound('Plan');
  return toApi(plan);
}

export async function updateMilestone(
  userId: Types.ObjectId,
  planId: Types.ObjectId,
  milestoneId: Types.ObjectId,
  input: Partial<MilestoneInput>,
) {
  const $set: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(input)) $set[`milestones.$.${k}`] = v;
  if (input.completed !== undefined) {
    $set['milestones.$.completedAt'] = input.completed ? new Date() : null;
  }
  const plan = await Plan.findOneAndUpdate(
    { _id: planId, userId, 'milestones._id': milestoneId },
    { $set },
    { returnDocument: 'after' },
  ).lean<IPlan>();
  if (!plan) throw notFound('Milestone');
  return toApi(plan);
}

export async function deleteMilestone(
  userId: Types.ObjectId,
  planId: Types.ObjectId,
  milestoneId: Types.ObjectId,
) {
  const plan = await Plan.findOneAndUpdate(
    { _id: planId, userId },
    { $pull: { milestones: { _id: milestoneId } } },
    { returnDocument: 'after' },
  ).lean<IPlan>();
  if (!plan) throw notFound('Plan');
  return toApi(plan);
}
