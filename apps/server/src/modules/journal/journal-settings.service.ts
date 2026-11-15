import {
  DEFAULT_JOURNAL_PREFS,
  isNightSleep,
  mergeJournalPrefs,
  resolveJournalPrefs,
  type JournalPrefs,
  type JournalPrefsPatch,
} from '@buzzprep/shared';
import type { AnyBulkWriteOperation, Types } from 'mongoose';
import { Reminder, UserProfile, type IReminder } from '../../db/models';
import { getProfile } from '../profile/profile.service';
import { loadActiveActivities } from '../schedule/agenda.service';

/**
 * Journal preferences live on the profile (`journal`). The first time a user opens the journal
 * the defaults are saved and the night reminder is moved to "N minutes before bed".
 */
export async function ensureJournalPrefs(
  userId: Types.ObjectId,
): Promise<{ prefs: JournalPrefs; remindersChanged: boolean }> {
  const profile = await getProfile(userId);
  if (profile.journal)
    return { prefs: resolveJournalPrefs(profile.journal), remindersChanged: false };
  const saved = await UserProfile.updateOne(
    { userId, journal: null },
    { $set: { journal: DEFAULT_JOURNAL_PREFS } },
  );
  const remindersChanged =
    saved.modifiedCount > 0 && profile.onboardingCompletedAt
      ? await syncNightReminder(userId, DEFAULT_JOURNAL_PREFS)
      : false;
  return { prefs: DEFAULT_JOURNAL_PREFS, remindersChanged };
}

export async function updateJournalPrefs(
  userId: Types.ObjectId,
  patch: JournalPrefsPatch,
): Promise<{ prefs: JournalPrefs; remindersChanged: boolean }> {
  const { prefs: current } = await ensureJournalPrefs(userId);
  const prefs = mergeJournalPrefs(current, patch);
  await UserProfile.updateOne({ userId }, { $set: { journal: prefs } });
  const timing = patch.windDownMinutes !== undefined || patch.nightReminder !== undefined;
  return { prefs, remindersChanged: timing ? await syncNightReminder(userId, prefs) : false };
}

/**
 * Keep one "Tonight’s journal" reminder per night-sleep activity of the active schedule,
 * `windDownMinutes` before it starts. Journal reminders anchored to other sleep-category
 * activities (the old wind-down reminder) are moved onto the sleep block, extras are switched
 * off. Title and body are left empty so the text follows the offset.
 */
export async function syncNightReminder(
  userId: Types.ObjectId,
  prefs: JournalPrefs,
): Promise<boolean> {
  const activities = await loadActiveActivities(userId);
  const sleepActivities = activities.filter((a) => a.category === 'sleep');
  const nights = sleepActivities.filter((a) => isNightSleep(a));
  if (nights.length === 0) return false;

  const existing = await Reminder.find({
    userId,
    kind: 'journal',
    anchor: 'activity_start',
    activityId: { $in: sleepActivities.map((a) => a._id) },
  })
    .sort({ createdAt: 1 })
    .lean<IReminder[]>();

  const nightIds = new Set(nights.map((n) => n._id.toHexString()));
  const byNight = new Map<string, IReminder[]>();
  const loose: IReminder[] = [];
  for (const r of existing) {
    const id = r.activityId?.toHexString();
    if (id && nightIds.has(id)) byNight.set(id, [...(byNight.get(id) ?? []), r]);
    else loose.push(r);
  }

  const desired = {
    offsetMinutes: -prefs.windDownMinutes,
    enabled: prefs.nightReminder,
    bypassQuietHours: true,
    title: null,
    body: null,
  };
  const ops: AnyBulkWriteOperation<IReminder>[] = [];
  const off = (r: IReminder) => {
    if (r.enabled)
      ops.push({ updateOne: { filter: { _id: r._id }, update: { $set: { enabled: false } } } });
  };
  for (const night of nights) {
    const mine = byNight.get(night._id.toHexString()) ?? [];
    const keep = mine.shift() ?? loose.shift();
    if (keep) {
      ops.push({
        updateOne: {
          filter: { _id: keep._id },
          update: { $set: { ...desired, activityId: night._id } },
        },
      });
    } else {
      ops.push({
        insertOne: {
          document: {
            userId,
            kind: 'journal',
            anchor: 'activity_start',
            activityId: night._id,
            time: null,
            recurrence: null,
            daysBefore: null,
            ...desired,
          } as unknown as IReminder,
        },
      });
    }
    mine.forEach(off);
  }
  loose.forEach(off);
  if (ops.length) await Reminder.bulkWrite(ops, { ordered: true });
  return ops.length > 0;
}
