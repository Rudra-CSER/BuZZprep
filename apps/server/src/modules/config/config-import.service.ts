import {
  CATEGORY_META,
  type ConfigBundle,
  type ImportMode,
  type ProfilePatch,
} from '@buzzprep/shared';
import { Types } from 'mongoose';
import {
  Activity,
  CareerApplication,
  Habit,
  LearningTopic,
  LearningTrack,
  Plan,
  Reminder,
  ScheduleTemplate,
  User,
  UserProfile,
} from '../../db/models';

export interface ImportSummary {
  plan: boolean;
  tracks: number;
  topics: number;
  activities: number;
  reminders: number;
  habits: number;
  applications: number;
}

/**
 * Apply a config bundle to a user's account.
 *  - replace: the bundle's schedule becomes the active one, the active plan is archived, and
 *    standalone (time/milestone) reminders are replaced. History is never deleted.
 *  - merge: everything is added alongside existing data (a new schedule stays inactive if one
 *    is already active).
 * Tracks, habits and applications are matched by name so re-imports don't duplicate them.
 */
export async function importBundle(
  userId: Types.ObjectId,
  bundle: ConfigBundle,
  mode: ImportMode,
): Promise<ImportSummary> {
  const summary: ImportSummary = {
    plan: false,
    tracks: 0,
    topics: 0,
    activities: 0,
    reminders: 0,
    habits: 0,
    applications: 0,
  };

  if (bundle.user?.displayName) {
    await User.updateOne({ _id: userId }, { $set: { displayName: bundle.user.displayName } });
  }
  if (bundle.profile && Object.keys(bundle.profile).length > 0) {
    await UserProfile.updateOne({ userId }, { $set: bundle.profile as ProfilePatch });
  }
  if (bundle.setup) {
    await UserProfile.updateOne({ userId }, { $set: { onboardingAnswers: bundle.setup } });
  }

  if (bundle.plan) {
    if (mode === 'replace') {
      await Plan.updateMany({ userId, status: 'active' }, { $set: { status: 'archived' } });
    }
    const hasActive = await Plan.exists({ userId, status: 'active' });
    await Plan.create({
      userId,
      ...bundle.plan,
      status: hasActive ? 'paused' : 'active',
      sourceTemplate: bundle.name ?? null,
    });
    summary.plan = true;
  }

  // Tracks: reuse existing ones with the same kind + title.
  const trackIdByRef = new Map<string, Types.ObjectId>();
  const existingTracks = await LearningTrack.find({ userId, archived: false }).lean();
  let order = existingTracks.length;
  for (const t of bundle.tracks) {
    const match = existingTracks.find(
      (e) => e.kind === t.kind && e.title.trim().toLowerCase() === t.title.trim().toLowerCase(),
    );
    if (match) {
      trackIdByRef.set(t.ref, match._id);
      continue;
    }
    const track = await LearningTrack.create({
      userId,
      title: t.title,
      kind: t.kind,
      description: t.description ?? null,
      color: t.color ?? null,
      resources: t.resources,
      order: order++,
    });
    trackIdByRef.set(t.ref, track._id);
    if (t.topics.length > 0) {
      await LearningTopic.insertMany(
        t.topics.map((topic, i) => ({
          userId,
          trackId: track._id,
          title: topic.title,
          type: topic.type,
          resources: topic.resources,
          notes: topic.notes ?? null,
          order: i,
        })),
      );
    }
    summary.tracks++;
    summary.topics += t.topics.length;
  }

  const activityIdByRef = new Map<string, Types.ObjectId>();
  if (bundle.schedule) {
    const hasActive = await ScheduleTemplate.exists({ userId, isActive: true });
    const activate = mode === 'replace' || !hasActive;
    if (activate) await ScheduleTemplate.updateMany({ userId }, { $set: { isActive: false } });
    const template = await ScheduleTemplate.create({
      userId,
      name: bundle.schedule.name,
      description: bundle.schedule.description ?? null,
      isActive: activate,
    });
    const docs = bundle.schedule.activities.map((a) => {
      const _id = new Types.ObjectId();
      activityIdByRef.set(a.ref, _id);
      return {
        _id,
        userId,
        templateId: template._id,
        title: a.title,
        description: a.description ?? null,
        category: a.category,
        startTime: a.startTime,
        durationMinutes: a.durationMinutes,
        recurrence: a.recurrence,
        priority: a.priority,
        essential: a.essential,
        blocking: a.blocking ?? CATEGORY_META[a.category].defaultBlocking,
        trackId: a.trackRef ? (trackIdByRef.get(a.trackRef) ?? null) : null,
        color: a.color ?? null,
        modeBehavior: a.modeBehavior ?? null,
        progression: a.progression ?? null,
        notes: a.notes ?? null,
      };
    });
    if (docs.length > 0) await Activity.insertMany(docs);
    summary.activities = docs.length;
  }

  if (mode === 'replace' && bundle.reminders.length > 0) {
    await Reminder.deleteMany({ userId, activityId: null });
  }
  const reminderDocs = bundle.reminders.flatMap((r) => {
    const activityId = r.activityRef ? activityIdByRef.get(r.activityRef) : null;
    if (r.activityRef && !activityId) return [];
    return [
      {
        userId,
        kind: r.kind,
        anchor: r.anchor,
        activityId: activityId ?? null,
        offsetMinutes: r.offsetMinutes,
        time: r.time ?? null,
        recurrence: r.recurrence ?? null,
        daysBefore: r.daysBefore ?? null,
        title: r.title ?? null,
        body: r.body ?? null,
        enabled: r.enabled,
        bypassQuietHours: r.bypassQuietHours,
      },
    ];
  });
  if (reminderDocs.length > 0) await Reminder.insertMany(reminderDocs);
  summary.reminders = reminderDocs.length;

  if (bundle.habits.length > 0) {
    const names = new Set(
      (await Habit.find({ userId, archived: false }).select({ name: 1 }).lean()).map((h) =>
        h.name.toLowerCase(),
      ),
    );
    const fresh = bundle.habits.filter((h) => !names.has(h.name.toLowerCase()));
    if (fresh.length > 0) {
      await Habit.insertMany(fresh.map((h, i) => ({ userId, ...h, order: names.size + i })));
    }
    summary.habits = fresh.length;
  }

  const applications = bundle.career?.applications ?? [];
  if (applications.length > 0) {
    const companies = new Set(
      (await CareerApplication.find({ userId }).select({ company: 1 }).lean()).map((a) =>
        a.company.toLowerCase(),
      ),
    );
    const fresh = applications.filter((a) => !companies.has(a.company.toLowerCase()));
    if (fresh.length > 0) {
      const now = new Date();
      await CareerApplication.insertMany(
        fresh.map((a) => ({ userId, ...a, stageHistory: [{ stage: a.stage, at: now }] })),
      );
    }
    summary.applications = fresh.length;
  }

  return summary;
}

/**
 * Import a bundle the way the app and the CLI do: apply it, and treat a bundle that contains a
 * routine as a complete setup, so the user skips the setup wizard.
 */
export async function importConfiguration(
  userId: Types.ObjectId,
  bundle: ConfigBundle,
  mode: ImportMode,
): Promise<ImportSummary> {
  const summary = await importBundle(userId, bundle, mode);
  if (bundle.schedule) {
    await UserProfile.updateOne(
      { userId, onboardingCompletedAt: null },
      { $set: { onboardingCompletedAt: new Date() } },
    );
  }
  return summary;
}
