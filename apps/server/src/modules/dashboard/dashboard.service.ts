import {
  addDays,
  CATEGORY_META,
  consistency,
  eachDate,
  greetingFor,
  isActive,
  logicalDateOf,
  logicalDayStart,
  needsReview,
  planNotifications,
  prepProgress,
  problemStats,
  summarizeCompletion,
  toDateTime,
  type LocalDate,
  type Occurrence,
  type TimeContext,
} from '@buzzprep/shared';
import type { Types } from 'mongoose';
import {
  DSAProblem,
  JournalEntry,
  LearningTopic,
  LearningTrack,
  Notification,
  Plan,
  PushSubscriptionModel,
  User,
  type ILearningTopic,
  type INotification,
  type IPlan,
} from '../../db/models';
import { toApi } from '../../lib/serialize';
import {
  getProfile,
  notificationPrefs,
  timeContext,
  type ProfileDoc,
} from '../profile/profile.service';
import { loadEnabledRules } from '../reminders/reminders.service';
import { loadAgenda } from '../schedule/agenda.service';
import { loadDayModes } from '../schedule/day-modes.service';

const WEEK_DAYS = 7;
const PREVIEW_HOURS = 24;

interface NextReminder {
  title: string;
  body: string;
  fireAt: string;
  kind: string;
  /** false when previewed from the rules because nothing is queued (no device yet). */
  queued: boolean;
}

/**
 * Everything the home screen needs in one call: today's sessions, what needs a decision,
 * the next session and reminder, the last 7 days, learning progress and device status.
 */
export async function getDashboard(userId: Types.ObjectId, pushEnabled: boolean) {
  const now = Date.now();
  const [user, profile] = await Promise.all([User.findById(userId).lean(), getProfile(userId)]);
  const ctx = timeContext(profile);
  const grace = profile.missedGraceMinutes;
  const today = logicalDateOf(now, ctx);
  const weekFrom = addDays(today, -(WEEK_DAYS - 1));

  const [agenda, plan, dayModes, problems, dueProblems, systemDesign, journal, deviceCount] =
    await Promise.all([
      // From the day before the week (overnight blocks) to tomorrow (upcoming sessions).
      loadAgenda(userId, profile, addDays(weekFrom, -1), addDays(today, 1)),
      Plan.findOne({ userId, status: 'active' }).lean<IPlan>(),
      loadDayModes(userId, today, today),
      DSAProblem.find({ userId }).select({ firstOutcome: 1, bestOutcome: 1, difficulty: 1 }).lean(),
      DSAProblem.countDocuments({ userId, 'revision.dueDate': { $ne: null, $lte: today } }),
      systemDesignProgress(userId, today),
      JournalEntry.find({ userId, date: today, type: { $in: ['morning', 'evening'] } })
        .select({ type: 1 })
        .lean(),
      PushSubscriptionModel.countDocuments({ userId }),
    ]);

  const todays = agenda.filter((o) => o.displayDate === today);
  const week = weekSummary(agenda, weekFrom, today, now, grace);

  return {
    now: new Date(now).toISOString(),
    today,
    timezone: profile.timezone,
    greeting: greetingFor(toDateTime(now, ctx.zone).hour),
    displayName: user?.displayName ?? '',
    onboardingCompleted: !!profile.onboardingCompletedAt,
    mode: dayModes[today] ?? 'normal',
    plan: plan ? planSummary(plan, today) : null,
    todayAgenda: { spillover: spillover(agenda, today, ctx), occurrences: todays },
    completion: summarizeCompletion(todays, now, grace),
    needsReview: agenda.filter(
      (o) => o.displayDate >= weekFrom && o.displayDate <= today && needsReview(o, now, grace),
    ).length,
    nextSession: nextSession(agenda, today, now),
    nextReminder: await nextReminder(userId, profile, agenda, ctx, now),
    week: { days: week, ...consistency(week) },
    dsa: { ...problemStats(problems), dueRevisions: dueProblems },
    systemDesign,
    journal: {
      morning: journal.some((j) => j.type === 'morning'),
      evening: journal.some((j) => j.type === 'evening'),
    },
    push: { serverEnabled: pushEnabled, devices: deviceCount },
  };
}

function planSummary(plan: IPlan, today: LocalDate) {
  return {
    id: plan._id.toHexString(),
    title: plan.title,
    targetRole: plan.targetRole,
    startDate: plan.startDate,
    deadline: plan.deadline,
    progress: prepProgress(plan.startDate, plan.deadline, today),
    upcomingMilestones: toApi(
      plan.milestones
        .filter((m) => !m.completed)
        .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
        .slice(0, 3),
    ),
  };
}

/** Sessions from yesterday that run into today (e.g. last night's sleep). */
function spillover(agenda: Occurrence[], today: LocalDate, ctx: TimeContext) {
  const dayStart = logicalDayStart(today, ctx).toMillis();
  return agenda.filter(
    (o) => o.displayDate === addDays(today, -1) && Date.parse(o.end) > dayStart && isActive(o),
  );
}

/** The next study session that hasn't ended or been marked yet. */
function nextSession(agenda: Occurrence[], today: LocalDate, now: number): Occurrence | null {
  return (
    agenda
      .filter(
        (o) =>
          o.displayDate >= today &&
          CATEGORY_META[o.category].learning &&
          isActive(o) &&
          o.status === 'pending' &&
          Date.parse(o.end) > now,
      )
      .sort((a, b) => a.start.localeCompare(b.start))[0] ?? null
  );
}

/** Per-day completion and study minutes for the last 7 days. */
function weekSummary(
  agenda: Occurrence[],
  from: LocalDate,
  today: LocalDate,
  now: number,
  grace: number,
) {
  return eachDate(from, today).map((date) => {
    const day = agenda.filter((o) => o.displayDate === date);
    const s = summarizeCompletion(day, now, grace);
    return {
      date,
      planned: s.planned - s.skipped,
      done: s.completed,
      percent: s.percent,
      studyMinutes: day
        .filter((o) => o.status === 'completed' && CATEGORY_META[o.category].learning)
        .reduce((sum, o) => sum + (o.actualMinutes ?? o.durationMinutes), 0),
    };
  });
}

/** The next queued reminder or, when nothing is queued (no device yet), a preview from the rules. */
async function nextReminder(
  userId: Types.ObjectId,
  profile: ProfileDoc,
  agenda: Occurrence[],
  ctx: TimeContext,
  now: number,
): Promise<NextReminder | null> {
  const queued = await Notification.findOne({
    userId,
    status: 'pending',
    fireAt: { $gte: new Date(now) },
  })
    .sort({ fireAt: 1 })
    .lean<INotification>();
  if (queued) {
    return {
      title: queued.title,
      body: queued.body,
      fireAt: queued.fireAt.toISOString(),
      kind: queued.kind,
      queued: true,
    };
  }
  const preview = planNotifications({
    reminders: await loadEnabledRules(userId),
    occurrences: agenda,
    milestones: [],
    prefs: notificationPrefs(profile),
    from: new Date(now).toISOString(),
    to: new Date(now + PREVIEW_HOURS * 3_600_000).toISOString(),
    ctx,
  }).find((p) => !p.suppressedReason);
  return preview
    ? {
        title: preview.title,
        body: preview.body,
        fireAt: preview.fireAt,
        kind: preview.kind,
        queued: false,
      }
    : null;
}

/** Concepts and practice problems covered across the user's system design tracks. */
async function systemDesignProgress(userId: Types.ObjectId, today: LocalDate) {
  const tracks = await LearningTrack.find({ userId, kind: 'system_design', archived: false })
    .select({ _id: 1 })
    .lean();
  const topics =
    tracks.length > 0
      ? await LearningTopic.find({ userId, trackId: { $in: tracks.map((t) => t._id) } })
          .select({ status: 1, type: 1, revision: 1 })
          .lean<Pick<ILearningTopic, 'status' | 'type' | 'revision'>[]>()
      : [];
  const count = (type: 'concept' | 'practice', completed = false) =>
    topics.filter((t) => t.type === type && (!completed || t.status === 'completed')).length;
  return {
    concepts: count('concept'),
    conceptsCompleted: count('concept', true),
    practice: count('practice'),
    practiceCompleted: count('practice', true),
    dueRevisions: topics.filter((t) => t.revision?.dueDate && t.revision.dueDate <= today).length,
  };
}
