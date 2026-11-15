import {
  addDays,
  localTimeOf,
  logicalDateOf,
  needsReview,
  occursOn,
  suggestSlots,
  type LocalDate,
  type Occurrence,
  type OccurrenceUpdateInput,
  type RescheduleInput,
} from '@buzzprep/shared';
import type { Types } from 'mongoose';
import {
  Activity,
  ActivityOccurrence,
  Habit,
  HabitCompletion,
  type IActivity,
  type IActivityOccurrence,
} from '../../db/models';
import { badRequest, conflict, notFound } from '../../lib/errors';
import { toApi } from '../../lib/serialize';
import {
  getProfile,
  notificationPrefs,
  timeContext,
  todayFor,
  type ProfileDoc,
} from '../profile/profile.service';
import { loadAgenda, loadAgendaWindow, loadOccurrence } from './agenda.service';

const REVIEW_WINDOW_DAYS = 7;
const SUGGESTION_HORIZON_DAYS = 3;

async function requireActivity(
  userId: Types.ObjectId,
  activityId: Types.ObjectId,
  date: LocalDate,
) {
  const activity = await Activity.findOne({ _id: activityId, userId }).lean<IActivity>();
  if (!activity) throw notFound('Activity');
  if (!occursOn(activity.recurrence, date)) {
    throw badRequest('That activity has no occurrence on this date.');
  }
  return activity;
}

/** One session (activity + original date) with its activity, as shown in the session screen. */
export async function getOccurrenceDetail(
  userId: Types.ObjectId,
  activityId: Types.ObjectId,
  date: LocalDate,
) {
  const profile = await getProfile(userId);
  const [occurrence, activity] = await Promise.all([
    loadOccurrence(userId, profile, activityId, date),
    Activity.findOne({ _id: activityId, userId }).lean<IActivity>(),
  ]);
  if (!occurrence || !activity) throw notFound('Occurrence');
  return { occurrence, activity: toApi(activity), today: todayFor(profile) };
}

export async function getOccurrence(
  userId: Types.ObjectId,
  activityId: Types.ObjectId,
  date: LocalDate,
): Promise<Occurrence | null> {
  return loadOccurrence(userId, await getProfile(userId), activityId, date);
}

/** Sessions from the last 7 days that ended without being marked done or skipped. */
export async function listNeedingDecision(userId: Types.ObjectId, now = Date.now()) {
  const profile = await getProfile(userId);
  const today = todayFor(profile, now);
  const agenda = await loadAgenda(
    userId,
    profile,
    addDays(today, -(REVIEW_WINDOW_DAYS - 1)),
    today,
  );
  return {
    today,
    occurrences: agenda.filter((o) => needsReview(o, now, profile.missedGraceMinutes)),
  };
}

/** Mark a session done/skipped/pending, or record notes and actual minutes. */
export async function updateOccurrence(
  userId: Types.ObjectId,
  activityId: Types.ObjectId,
  date: LocalDate,
  input: OccurrenceUpdateInput,
): Promise<IActivityOccurrence> {
  const activity = await requireActivity(userId, activityId, date);
  const $set: Record<string, unknown> = {};
  if (input.status) {
    $set.status = input.status;
    $set.completedAt = input.status === 'completed' ? new Date() : null;
    $set.skippedAt = input.status === 'skipped' ? new Date() : null;
  }
  if ('note' in input) $set.note = input.note ?? null;
  if ('actualMinutes' in input) $set.actualMinutes = input.actualMinutes ?? null;

  const doc = await ActivityOccurrence.findOneAndUpdate(
    { userId, activityId, date },
    { $set },
    { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true },
  ).lean<IActivityOccurrence>();

  if (input.status) {
    await syncLinkedHabits(userId, activity.category, doc!.override?.date ?? date);
  }
  return doc!;
}

/**
 * Habits linked to an activity category (e.g. "DSA practice" ↔ dsa) are ticked automatically
 * on days where at least one occurrence of that category is completed.
 */
async function syncLinkedHabits(
  userId: Types.ObjectId,
  category: IActivity['category'],
  day: LocalDate,
) {
  const habits = await Habit.find({ userId, linkedCategory: category, archived: false })
    .select({ _id: 1 })
    .lean();
  if (habits.length === 0) return;
  const activityIds = (await Activity.find({ userId, category }).select({ _id: 1 }).lean()).map(
    (a) => a._id,
  );
  const done = await ActivityOccurrence.exists({
    userId,
    activityId: { $in: activityIds },
    status: 'completed',
    $or: [{ date: day, override: null }, { 'override.date': day }],
  });
  for (const habit of habits) {
    if (done) {
      await HabitCompletion.updateOne(
        { habitId: habit._id, date: day },
        { $setOnInsert: { userId, habitId: habit._id, date: day, value: 1, source: 'auto' } },
        { upsert: true },
      );
    } else {
      await HabitCompletion.deleteOne({ habitId: habit._id, date: day, source: 'auto' });
    }
  }
}

async function moveOccurrence(
  userId: Types.ObjectId,
  profile: ProfileDoc,
  activityId: Types.ObjectId,
  date: LocalDate,
  input: RescheduleInput,
): Promise<{ occurrence: Occurrence | null; conflicts: Occurrence[] }> {
  const activity = await requireActivity(userId, activityId, date);
  const current = await loadOccurrence(userId, profile, activityId, date);
  if (current?.status === 'completed') throw conflict('This session is already completed.');
  const durationMinutes =
    input.durationMinutes ?? current?.durationMinutes ?? activity.durationMinutes;

  await ActivityOccurrence.updateOne(
    { userId, activityId, date },
    {
      $set: {
        override: { date: input.date, startTime: input.startTime, durationMinutes },
        status: 'pending',
        skippedAt: null,
      },
    },
    { upsert: true, setDefaultsOnInsert: true },
  );

  const agenda = await loadAgenda(userId, profile, input.date, input.date);
  const moved =
    agenda.find((o) => o.activityId === activityId.toHexString() && o.date === date) ?? null;
  const conflicts = moved
    ? agenda.filter(
        (o) =>
          o.key !== moved.key &&
          o.blocking &&
          o.modeAction !== 'skip' &&
          o.status !== 'skipped' &&
          o.start < moved.end &&
          o.end > moved.start,
      )
    : [];
  return { occurrence: moved, conflicts };
}

/** Move one session to another day/time. Returns the blocking sessions it now overlaps. */
export async function rescheduleOccurrence(
  userId: Types.ObjectId,
  activityId: Types.ObjectId,
  date: LocalDate,
  input: RescheduleInput,
) {
  return moveOccurrence(userId, await getProfile(userId), activityId, date, input);
}

/** Push one session later by `minutes`. */
export async function postponeOccurrence(
  userId: Types.ObjectId,
  activityId: Types.ObjectId,
  date: LocalDate,
  minutes: number,
) {
  const profile = await getProfile(userId);
  const current = await loadOccurrence(userId, profile, activityId, date);
  if (!current) throw notFound('Occurrence');
  const ctx = timeContext(profile);
  const newStart = Date.parse(current.start) + minutes * 60_000;
  return moveOccurrence(userId, profile, activityId, date, {
    date: logicalDateOf(newStart, ctx),
    startTime: localTimeOf(newStart, ctx.zone),
    durationMinutes: current.durationMinutes,
  });
}

/** Undo a move: the session returns to its planned time. */
export async function clearOverride(
  userId: Types.ObjectId,
  activityId: Types.ObjectId,
  date: LocalDate,
): Promise<Occurrence | null> {
  await ActivityOccurrence.updateOne({ userId, activityId, date }, { $set: { override: null } });
  return getOccurrence(userId, activityId, date);
}

/** Free slots in the next few days that avoid sleep, work, other blocking activities and quiet hours. */
export async function suggestFreeSlots(
  userId: Types.ObjectId,
  activityId: Types.ObjectId,
  date: LocalDate,
) {
  const profile = await getProfile(userId);
  const occurrence = await loadOccurrence(userId, profile, activityId, date);
  if (!occurrence) throw notFound('Occurrence');
  const now = Date.now();
  const today = todayFor(profile, now);
  const prefs = notificationPrefs(profile);
  const agenda = await loadAgendaWindow(userId, profile, today, SUGGESTION_HORIZON_DAYS);
  return suggestSlots({
    target: occurrence,
    agenda,
    now,
    ctx: timeContext(profile),
    horizonDays: SUGGESTION_HORIZON_DAYS,
    avoid: prefs.quietHours.enabled
      ? [{ start: prefs.quietHours.start, end: prefs.quietHours.end }]
      : [],
  });
}
