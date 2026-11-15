import {
  diffDays,
  eachDate,
  type DayModeInput,
  type LocalDate,
  type ScheduleMode,
} from '@buzzprep/shared';
import type { Types } from 'mongoose';
import { DayPlan } from '../../db/models';
import { badRequest } from '../../lib/errors';

const MAX_RANGE_DAYS = 31;

/** Day modes in [from, to]. Days without an entry are "normal". */
export async function loadDayModes(
  userId: Types.ObjectId,
  from: LocalDate,
  to: LocalDate,
): Promise<Record<LocalDate, ScheduleMode>> {
  const plans = await DayPlan.find({ userId, date: { $gte: from, $lte: to } }).lean();
  return Object.fromEntries(plans.map((p) => [p.date, p.mode]));
}

/** Set a mode for one day, or for every day through `input.until` (at most 31 days). */
export async function setDayMode(userId: Types.ObjectId, date: LocalDate, input: DayModeInput) {
  const until = input.until ?? date;
  if (until < date || diffDays(date, until) > MAX_RANGE_DAYS) {
    throw badRequest('Choose up to 31 days.');
  }
  for (const d of eachDate(date, until)) {
    if (input.mode === 'normal') {
      await DayPlan.deleteOne({ userId, date: d });
    } else {
      await DayPlan.updateOne(
        { userId, date: d },
        { $set: { mode: input.mode, note: input.note ?? null } },
        { upsert: true },
      );
    }
  }
  return loadDayModes(userId, date, until);
}

export async function clearDayMode(userId: Types.ObjectId, date: LocalDate): Promise<void> {
  await DayPlan.deleteOne({ userId, date });
}
