import {
  addDays,
  CATEGORY_META,
  compileWeek,
  isActive,
  startOfWeek,
  weekToMarkdown,
  type LocalDate,
  type Weekday,
} from '@buzzprep/shared';
import type { Types } from 'mongoose';
import {
  JournalEntry,
  WeeklyReview,
  type IJournalEntry,
  type IWeeklyReview,
} from '../../db/models';
import { AppError, badRequest, unavailable } from '../../lib/errors';
import type { AiService } from '../ai/ai.service';
import { assertWithinDailyLimit, enqueueJob, hasOpenJob } from '../ai/job-queue';
import { getProfile, todayFor, type ProfileDoc } from '../profile/profile.service';
import { loadAgenda } from '../schedule/agenda.service';
import { ensureJournalPrefs } from './journal-settings.service';
import { entrySummary, logOf } from './journal.service';

/** A week of the night journal: the compiled revision sheet, session stats and the AI summary. */

export function weekStartFor(profile: Pick<ProfileDoc, 'weekStartsOn'>, date: LocalDate) {
  return startOfWeek(date, (profile.weekStartsOn ?? 1) as Weekday);
}

export async function compileUserWeek(
  userId: Types.ObjectId,
  profile: ProfileDoc,
  weekStart: LocalDate,
) {
  const weekEnd = addDays(weekStart, 6);
  const today = todayFor(profile);
  const [entries, agenda] = await Promise.all([
    JournalEntry.find({ userId, type: 'evening', date: { $gte: weekStart, $lte: weekEnd } })
      .sort({ date: 1 })
      .lean<IJournalEntry[]>(),
    loadAgenda(userId, profile, weekStart, weekEnd),
  ]);
  const week = compileWeek(
    entries.map((e) => ({
      date: e.date,
      mood: e.mood,
      energy: e.energy,
      notes: e.notes ?? null,
      log: logOf(e).text || null,
      completed: e.completedAt !== null,
    })),
  );
  // Learning sessions up to today: what was planned, done and skipped.
  const learning = agenda.filter(
    (o) => CATEGORY_META[o.category].learning && o.displayDate <= today && o.modeAction !== 'skip',
  );
  const sessions = {
    planned: learning.length,
    done: learning.filter((o) => o.status === 'completed').length,
    skipped: learning.filter((o) => !isActive(o)).length,
  };
  return { weekStart, weekEnd, today, entries, week, sessions };
}

function summaryView(review: IWeeklyReview | null) {
  return {
    summary: review?.summary ?? null,
    summaryStatus: review?.summaryStatus ?? 'idle',
    summaryError: review?.summaryError ?? null,
    summaryModel: review?.summaryModel ?? null,
    summaryGeneratedAt: review?.summaryGeneratedAt?.toISOString() ?? null,
  };
}

export async function weekView(ai: AiService, userId: Types.ObjectId, date: LocalDate) {
  const profile = await getProfile(userId);
  const { prefs } = await ensureJournalPrefs(userId);
  const weekStart = weekStartFor(profile, date);
  const [{ weekEnd, today, entries, week, sessions }, review] = await Promise.all([
    compileUserWeek(userId, profile, weekStart),
    WeeklyReview.findOne({ userId, weekStart }).lean<IWeeklyReview>(),
  ]);
  const byDate = new Map(entries.map((e) => [e.date, e]));
  return {
    weekStart,
    weekEnd,
    today,
    days: Array.from({ length: 7 }, (_, i) => {
      const d = addDays(weekStart, i);
      const e = byDate.get(d);
      return { date: d, entry: e ? entrySummary(e) : null };
    }),
    week,
    sessions,
    ...summaryView(review),
    ai: { summary: ai.availability.notes && prefs.useAi },
  };
}

export async function requestWeeklySummary(
  ai: AiService,
  userId: Types.ObjectId,
  date: LocalDate,
  { auto = false } = {},
) {
  if (!ai.writer) throw unavailable('Weekly summaries need an AI provider on the server.');
  const profile = await getProfile(userId);
  const { prefs } = await ensureJournalPrefs(userId);
  if (!prefs.useAi) throw new AppError(409, 'ai_off', 'AI is turned off in your journal settings.');
  const weekStart = weekStartFor(profile, date);
  if (weekStart > todayFor(profile)) throw badRequest('That week hasn’t started yet.');
  const { week } = await compileUserWeek(userId, profile, weekStart);
  if (week.nights === 0) throw badRequest('There are no journal entries in this week yet.');
  if (await hasOpenJob({ userId, type: 'weekly_summary', weekStart })) {
    return weekStart;
  }
  if (!auto) await assertWithinDailyLimit(userId, ai.dailyLimit);
  await WeeklyReview.updateOne(
    { userId, weekStart },
    {
      $set: { summaryStatus: 'queued', summaryError: null },
      $setOnInsert: { userId, weekStart },
    },
    { upsert: true },
  );
  await enqueueJob({ userId, type: 'weekly_summary', weekStart, auto });
  return weekStart;
}

export async function exportWeek(userId: Types.ObjectId, date: LocalDate) {
  const profile = await getProfile(userId);
  const weekStart = weekStartFor(profile, date);
  const [{ week }, review] = await Promise.all([
    compileUserWeek(userId, profile, weekStart),
    WeeklyReview.findOne({ userId, weekStart }).lean<IWeeklyReview>(),
  ]);
  return { weekStart, markdown: weekToMarkdown(weekStart, week, review?.summary ?? null) };
}
