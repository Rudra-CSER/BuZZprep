import type { Weekday } from '../../constants';
import { addMinutesToTime, minutesBetween, type LocalTime } from '../../time';
import { categoryFor, lm, pickSpread, round5, type PlanContext } from './context';
import type { RoutineBuilder } from './routine-builder';

/** Times later steps (reminders, habits) need from the placed routine. */
export interface RoutineAnchors {
  /** Morning planning starts 15 minutes after waking; milestone reminders use it too. */
  planningStart: LocalTime;
  /** End of the last weekday study block, if there is one. */
  studyEnd: LocalTime | null;
  gymDays: Weekday[];
}

/**
 * Place the weekly routine around fixed commitments: sleep first, then work, then study blocks
 * in the time that is left, then the weekend and the gym. Activities are added in this order.
 */
export function buildRoutine(b: RoutineBuilder, ctx: PlanContext): RoutineAnchors {
  const { windDownStart, planningStart } = addSleep(b, ctx);
  const getReadyStart = addWork(b, ctx);
  addMorningRevision(b, ctx, planningStart, getReadyStart);
  const studyEnd = addStudyBlocks(b, ctx, windDownStart);
  addWeekend(b, ctx);
  const gymDays = addGym(b, ctx, studyEnd);
  return { planningStart, studyEnd, gymDays };
}

/** Sleep (with an optional gradual bedtime shift), wind-down and morning planning. */
function addSleep(b: RoutineBuilder, { answers, start, days }: PlanContext) {
  const { targetBedtime: bed, targetWake: wake, currentBedtime } = answers.sleep;
  const shift = answers.sleep.gradualShift && lm(currentBedtime) > lm(bed);
  const windDownStart = addMinutesToTime(bed, -30);

  b.add({
    ref: 'sleep',
    title: 'Sleep',
    category: 'sleep',
    startTime: bed,
    durationMinutes: minutesBetween(bed, wake),
    days: days.all,
    priority: 'critical',
    essential: true,
    blocking: true,
    description: 'Protect it — everything else depends on it.',
    progression: shift
      ? { fromTime: currentBedtime, stepMinutes: 15, everyDays: 3, startDate: start, keepEnd: true }
      : null,
  });
  b.add({
    ref: 'wind_down',
    title: 'Wind down & prepare for sleep',
    category: 'sleep',
    startTime: windDownStart,
    durationMinutes: 30,
    days: days.all,
    priority: 'high',
    blocking: true,
    description: 'Evening journal, screens down, lights low.',
    progression: shift
      ? {
          fromTime: addMinutesToTime(currentBedtime, -30),
          stepMinutes: 15,
          everyDays: 3,
          startDate: start,
          keepEnd: false,
        }
      : null,
  });

  const planningStart = addMinutesToTime(wake, 15);
  b.add({
    ref: 'morning_planning',
    title: 'Morning planning & journal',
    category: 'journaling',
    startTime: planningStart,
    durationMinutes: 15,
    days: days.all,
    priority: 'medium',
    description: 'Top three tasks, energy check, today’s plan.',
    modeBehavior: { recovery: 'keep' },
  });
  return { windDownStart, planningStart };
}

/** Getting ready and commuting, work itself, and a protected hour after work. */
function addWork(b: RoutineBuilder, { answers, days }: PlanContext): LocalTime | null {
  const work = answers.work;
  if (!work.enabled || days.work.length === 0) return null;
  const prep = work.commuteMinutes + 15;
  const getReadyStart = addMinutesToTime(work.start, -prep);
  b.add({
    ref: 'get_ready',
    title: work.commuteMinutes > 0 ? 'Get ready & commute' : 'Get ready',
    category: 'personal',
    startTime: getReadyStart,
    durationMinutes: prep,
    days: days.work,
    blocking: true,
  });
  b.add({
    ref: 'work',
    title: work.label,
    category: 'job',
    startTime: work.start,
    durationMinutes: minutesBetween(work.start, work.end),
    days: days.work,
    priority: 'critical',
    essential: true,
    blocking: true,
  });
  b.add({
    ref: 'after_work',
    title: work.commuteMinutes > 0 ? 'Commute, rest & food' : 'Rest & food',
    category: 'rest',
    startTime: work.end,
    durationMinutes: 60,
    days: days.work,
    blocking: true,
    description: 'Decompress before studying. This hour is protected.',
  });
  return getReadyStart;
}

/** Light revision after morning planning, shortened to fit before getting ready for work. */
function addMorningRevision(
  b: RoutineBuilder,
  { answers, primary, days }: PlanContext,
  planningStart: LocalTime,
  getReadyStart: LocalTime | null,
) {
  const morning = answers.study.morningRevisionMinutes;
  if (!primary || morning < 10 || days.weekdayStudy.length === 0) return;
  const revStart = addMinutesToTime(planningStart, 30);
  const room = getReadyStart ? lm(getReadyStart) - lm(revStart) : morning;
  const duration = Math.min(morning, room);
  if (duration < 10) return;
  b.add({
    ref: 'morning_revision',
    title: 'Light revision',
    category: categoryFor(primary.kind),
    trackRef: primary.ref,
    startTime: revStart,
    durationMinutes: duration,
    days: days.weekdayStudy,
    priority: 'low',
    description: 'Revisit problems due for spaced revision. Light, not new material.',
    modeBehavior: { busy: 'optional', low_energy: 'optional', recovery: 'skip' },
  });
}

/**
 * The weekday study time, split into a main session for the primary track and (after a dinner
 * break) a second session that rotates through the other tracks. Whatever is left before
 * wind-down becomes flexible personal time. Returns when studying ends.
 */
function addStudyBlocks(
  b: RoutineBuilder,
  { answers, primary, secondary, days }: PlanContext,
  windDownStart: LocalTime,
): LocalTime | null {
  const total = answers.study.weekdayMinutes;
  if (!primary || total < 15 || days.weekdayStudy.length === 0) return null;
  const work = answers.work;
  const blockStart = work.enabled
    ? addMinutesToTime(work.end, 60)
    : answers.study.preferredWindow === 'morning'
      ? addMinutesToTime(answers.sleep.targetWake, 75)
      : '18:00';
  const aMinutes = total >= 90 ? round5((total * 7) / 12) : total;
  const bMinutes = total - aMinutes;

  b.add({
    ref: 'session_main',
    title: `${primary.title} deep work`,
    category: categoryFor(primary.kind),
    trackRef: primary.ref,
    startTime: blockStart,
    durationMinutes: aMinutes,
    days: days.weekdayStudy,
    priority: 'high',
    description: 'Main learning session. Phone away, one problem or concept at a time.',
  });
  let studyEnd = addMinutesToTime(blockStart, aMinutes);

  if (bMinutes > 0) {
    b.add({
      ref: 'dinner_break',
      title: 'Break & dinner',
      category: 'food',
      startTime: studyEnd,
      durationMinutes: 30,
      days: days.weekdayStudy,
    });
    const bStart = addMinutesToTime(studyEnd, 30);
    const rotation = secondary.length > 0 ? secondary : [primary];
    const daysByTrack = new Map<string, Weekday[]>();
    days.weekdayStudy.forEach((day, i) => {
      const t = rotation[i % rotation.length]!;
      daysByTrack.set(t.ref, [...(daysByTrack.get(t.ref) ?? []), day]);
    });
    for (const t of rotation) {
      b.add({
        ref: `session_${t.ref}`,
        title: t.ref === primary.ref ? `${t.title} practice` : `${t.title} session`,
        category: categoryFor(t.kind),
        trackRef: t.ref,
        startTime: bStart,
        durationMinutes: bMinutes,
        days: daysByTrack.get(t.ref) ?? [],
        priority: 'high',
      });
    }
    studyEnd = addMinutesToTime(bStart, bMinutes);
  }

  const personal = lm(windDownStart) - lm(studyEnd);
  if (personal >= 30) {
    b.add({
      ref: 'personal_time',
      title: 'Personal time',
      category: 'personal',
      startTime: studyEnd,
      durationMinutes: personal,
      days: days.weekdayStudy,
      priority: 'low',
      blocking: false,
      description: 'Free time. Missed sessions can be moved here if you choose to.',
    });
  }
  return studyEnd;
}

/** A longer session on free days, and the weekly review on the first rest day. */
function addWeekend(b: RoutineBuilder, { answers, primary, days }: PlanContext) {
  const wake = answers.sleep.targetWake;
  const weekendMinutes = Math.min(answers.study.weekendMinutes, 300);
  const weekendStart =
    lm('11:00') >= lm(addMinutesToTime(wake, 60)) ? '11:00' : addMinutesToTime(wake, 120);
  if (primary && weekendMinutes >= 30 && days.weekendStudy.length > 0) {
    b.add({
      ref: 'weekend_deep',
      title: 'Weekend deep session',
      category: categoryFor(primary.kind),
      trackRef: primary.ref,
      startTime: weekendStart,
      durationMinutes: weekendMinutes,
      days: days.weekendStudy,
      priority: 'high',
      description: 'Contest, mock interview, or a long practice block.',
    });
  }

  const reviewDay: Weekday = answers.restDays[0] ?? 7;
  const reviewClashes = days.weekendStudy.includes(reviewDay) && weekendMinutes >= 30 && !!primary;
  b.add({
    ref: 'weekly_review',
    title: 'Weekly review & planning',
    category: 'journaling',
    startTime: reviewClashes ? '17:00' : weekendStart,
    durationMinutes: 45,
    days: [reviewDay],
    priority: 'high',
    description: 'Look at the week’s numbers, reflect, and plan the next week.',
    modeBehavior: { recovery: 'keep' },
  });
}

/** Gym sessions spread over the week: after studying on weekdays, at 18:00 otherwise. */
function addGym(
  b: RoutineBuilder,
  { answers, days }: PlanContext,
  studyEnd: LocalTime | null,
): Weekday[] {
  const fitness = answers.fitness;
  if (!fitness.enabled || fitness.sessionsPerWeek <= 0) return [];
  const gymDays =
    fitness.days.length > 0
      ? [...fitness.days]
      : pickSpread(
          days.all.filter((d) => !days.rest.has(d)),
          fitness.sessionsPerWeek,
        );
  const weekdayGym = gymDays.filter((d) => days.weekdayStudy.includes(d) || days.work.includes(d));
  const otherGym = gymDays.filter((d) => !weekdayGym.includes(d));
  const eveningGym = fitness.time ?? (studyEnd ? addMinutesToTime(studyEnd, 15) : '18:00');
  const common = {
    title: 'Gym',
    category: 'gym' as const,
    durationMinutes: fitness.durationMinutes,
    priority: 'medium' as const,
    description: 'Strength and mobility. Recovery days are part of the plan.',
  };
  b.add({ ...common, ref: 'gym_weekday', startTime: eveningGym, days: weekdayGym });
  b.add({ ...common, ref: 'gym_weekend', startTime: '18:00', days: otherGym });
  return gymDays;
}
