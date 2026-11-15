import { CONFIG_FORMAT, type ConfigBundle } from '@buzzprep/shared';
import type { Types } from 'mongoose';
import {
  Activity,
  CareerApplication,
  Habit,
  LearningTopic,
  LearningTrack,
  Plan,
  Reminder,
  User,
  UserProfile,
  type IActivity,
  type IReminder,
} from '../../db/models';
import { getActiveTemplate } from '../schedule/schedules.service';

/** Bundles reference records by name-like refs instead of database ids, so they are portable. */
const ref = (prefix: string, id: Types.ObjectId) => `${prefix}_${id.toHexString()}`;

/** Portable snapshot of the user's configuration (no journals, problems or history). */
export async function exportBundle(userId: Types.ObjectId): Promise<ConfigBundle> {
  const [user, profile, plan, tracks, template, habits, applications] = await Promise.all([
    User.findById(userId).lean(),
    UserProfile.findOne({ userId }).lean(),
    Plan.findOne({ userId, status: 'active' }).lean(),
    LearningTrack.find({ userId, archived: false }).sort({ order: 1 }).lean(),
    getActiveTemplate(userId),
    Habit.find({ userId, archived: false }).sort({ order: 1 }).lean(),
    CareerApplication.find({ userId, archived: false }).lean(),
  ]);
  const topics = await LearningTopic.find({ userId, trackId: { $in: tracks.map((t) => t._id) } })
    .sort({ order: 1 })
    .lean();
  const activities = template
    ? await Activity.find({ userId, templateId: template._id, archived: false }).lean<IActivity[]>()
    : [];
  const activityIds = new Set(activities.map((a) => a._id.toHexString()));
  const reminders = (await Reminder.find({ userId }).lean<IReminder[]>()).filter(
    (r) => !r.activityId || activityIds.has(r.activityId.toHexString()),
  );

  return {
    format: CONFIG_FORMAT,
    version: 1,
    name: `${user?.displayName ?? 'My'} configuration`,
    exportedAt: new Date().toISOString(),
    user: user ? { displayName: user.displayName } : undefined,
    profile: profile
      ? {
          timezone: profile.timezone,
          dayBoundaryMinutes: profile.dayBoundaryMinutes,
          weekStartsOn: profile.weekStartsOn,
          professional: profile.professional,
          education: profile.education,
          work: profile.work,
          sleep: profile.sleep,
          study: profile.study,
          fitness: profile.fitness,
          restDays: profile.restDays,
          skills: profile.skills,
          notifications: profile.notifications,
          revisionIntervals: profile.revisionIntervals,
          missedGraceMinutes: profile.missedGraceMinutes,
          theme: profile.theme,
        }
      : undefined,
    plan: plan
      ? {
          title: plan.title,
          goalType: plan.goalType,
          targetRole: plan.targetRole,
          targetCompanies: plan.targetCompanies,
          stretchCompanies: plan.stretchCompanies,
          compensationTarget: plan.compensationTarget,
          description: plan.description,
          startDate: plan.startDate,
          deadline: plan.deadline,
          milestones: plan.milestones.map((m) => ({
            title: m.title,
            dueDate: m.dueDate,
            completed: m.completed,
            note: m.note,
          })),
        }
      : undefined,
    tracks: tracks.map((t) => ({
      ref: ref('t', t._id),
      title: t.title,
      kind: t.kind,
      description: t.description,
      color: t.color,
      resources: t.resources.map((r) => ({ title: r.title, url: r.url, type: r.type as 'other' })),
      topics: topics
        .filter((tp) => tp.trackId.equals(t._id))
        .map((tp) => ({
          title: tp.title,
          type: tp.type,
          resources: tp.resources.map((r) => ({
            title: r.title,
            url: r.url,
            type: r.type as 'other',
          })),
          notes: tp.notes,
        })),
    })),
    schedule: template
      ? {
          name: template.name,
          description: template.description,
          activities: activities.map((a) => ({
            ref: ref('a', a._id),
            title: a.title,
            description: a.description,
            category: a.category,
            startTime: a.startTime,
            durationMinutes: a.durationMinutes,
            recurrence: a.recurrence,
            priority: a.priority,
            essential: a.essential,
            blocking: a.blocking,
            trackRef: a.trackId ? ref('t', a.trackId) : null,
            color: a.color,
            modeBehavior: a.modeBehavior,
            progression: a.progression,
            notes: a.notes,
          })),
        }
      : undefined,
    reminders: reminders.map((r) => ({
      kind: r.kind,
      anchor: r.anchor,
      activityRef: r.activityId ? ref('a', r.activityId) : null,
      offsetMinutes: r.offsetMinutes,
      time: r.time,
      recurrence: r.recurrence,
      daysBefore: r.daysBefore,
      title: r.title,
      body: r.body,
      enabled: r.enabled,
      bypassQuietHours: r.bypassQuietHours,
    })),
    habits: habits.map((h) => ({
      name: h.name,
      description: h.description,
      targetPerWeek: h.targetPerWeek,
      days: h.days as (1 | 2 | 3 | 4 | 5 | 6 | 7)[],
      linkedCategory: h.linkedCategory,
      graceMissesPerWeek: h.graceMissesPerWeek,
      color: h.color,
    })),
    setup: profile?.onboardingAnswers ?? undefined,
    career: {
      applications: applications.map((a) => ({
        company: a.company,
        role: a.role,
        stage: a.stage,
        tier: a.tier,
        jobUrl: a.jobUrl,
        notes: a.notes,
      })),
    },
  };
}
