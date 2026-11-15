import {
  addDays,
  diffDays,
  expandAgenda,
  type ActivityTemplate,
  type AgendaQuery,
  type LocalDate,
  type Occurrence,
  type OccurrenceState,
} from '@buzzprep/shared';
import type { Types } from 'mongoose';
import {
  Activity,
  ActivityOccurrence,
  type IActivity,
  type IActivityOccurrence,
} from '../../db/models';
import { badRequest } from '../../lib/errors';
import {
  getProfile,
  modeRules,
  timeContext,
  todayFor,
  type ProfileDoc,
} from '../profile/profile.service';
import { loadDayModes } from './day-modes.service';
import { getActiveTemplate } from './schedules.service';

const MAX_AGENDA_DAYS = 62;

/** Map a stored activity to the template format the shared schedule engine expands. */
export function toActivityTemplate(a: IActivity): ActivityTemplate {
  return {
    id: a._id.toHexString(),
    title: a.title,
    description: a.description,
    category: a.category,
    startTime: a.startTime,
    durationMinutes: a.durationMinutes,
    recurrence: a.recurrence,
    priority: a.priority,
    essential: a.essential,
    blocking: a.blocking,
    trackId: a.trackId ? a.trackId.toHexString() : null,
    color: a.color,
    modeBehavior: a.modeBehavior,
    progression: a.progression,
    archived: a.archived,
  };
}

/** Map a stored occurrence exception (done, skipped, moved…) to the engine's state format. */
export function toOccurrenceState(s: IActivityOccurrence): OccurrenceState {
  return {
    activityId: s.activityId.toHexString(),
    date: s.date,
    status: s.status,
    override: s.override,
    completedAt: s.completedAt ? s.completedAt.toISOString() : null,
    note: s.note,
    actualMinutes: s.actualMinutes,
  };
}

export async function loadActiveActivities(userId: Types.ObjectId): Promise<IActivity[]> {
  const template = await getActiveTemplate(userId);
  if (!template) return [];
  return Activity.find({ userId, templateId: template._id, archived: false }).lean<IActivity[]>();
}

/** Expanded agenda for [from, to] (inclusive logical dates) using the active schedule. */
export async function loadAgenda(
  userId: Types.ObjectId,
  profile: ProfileDoc,
  from: LocalDate,
  to: LocalDate,
): Promise<Occurrence[]> {
  const [activities, states, dayModes] = await Promise.all([
    loadActiveActivities(userId),
    ActivityOccurrence.find({
      userId,
      $or: [{ date: { $gte: from, $lte: to } }, { 'override.date': { $gte: from, $lte: to } }],
    }).lean<IActivityOccurrence[]>(),
    loadDayModes(userId, from, to),
  ]);
  return expandAgenda({
    activities: activities.map(toActivityTemplate),
    states: states.map(toOccurrenceState),
    dayModes,
    modeRules: modeRules(profile),
    from,
    to,
    ctx: timeContext(profile),
  });
}

/** One occurrence by identity (activity + original date), wherever it is displayed now. */
export async function loadOccurrence(
  userId: Types.ObjectId,
  profile: ProfileDoc,
  activityId: Types.ObjectId,
  date: LocalDate,
): Promise<Occurrence | null> {
  const state = await ActivityOccurrence.findOne({
    userId,
    activityId,
    date,
  }).lean<IActivityOccurrence>();
  const displayDate = state?.override?.date ?? date;
  const agenda = await loadAgenda(userId, profile, displayDate, displayDate);
  return agenda.find((o) => o.activityId === activityId.toHexString() && o.date === date) ?? null;
}

/** Agenda used for overlap checks: the day before (overnight blocks) through `days` ahead. */
export async function loadAgendaWindow(
  userId: Types.ObjectId,
  profile: ProfileDoc,
  today: LocalDate,
  daysAhead: number,
): Promise<Occurrence[]> {
  return loadAgenda(userId, profile, addDays(today, -1), addDays(today, daysAhead));
}

/** The agenda for a date range plus the time settings the client needs to render it. */
export async function getAgendaView(userId: Types.ObjectId, { from, to }: AgendaQuery) {
  if (diffDays(from, to) > MAX_AGENDA_DAYS) {
    throw badRequest(`Range too large (max ${MAX_AGENDA_DAYS} days).`);
  }
  const profile = await getProfile(userId);
  const [occurrences, dayModes] = await Promise.all([
    loadAgenda(userId, profile, from, to),
    loadDayModes(userId, from, to),
  ]);
  return {
    from,
    to,
    today: todayFor(profile),
    now: new Date().toISOString(),
    timezone: profile.timezone,
    dayBoundaryMinutes: profile.dayBoundaryMinutes,
    missedGraceMinutes: profile.missedGraceMinutes,
    occurrences,
    dayModes,
  };
}
