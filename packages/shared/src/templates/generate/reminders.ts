import { CATEGORY_META, DEFAULT_WIND_DOWN_MINUTES } from '../../constants';
import { addMinutesToTime } from '../../time';
import type { PlanContext } from './context';
import type { RoutineAnchors } from './routine';
import type { RoutineBuilder } from './routine-builder';

/**
 * Reminder rules for the generated routine: wake-up, planning, work, every study session
 * (before, at start, if not done), breaks, bedtime, the missed-sessions digest, the weekly
 * review and milestones. Rules for activities the routine doesn't have are skipped.
 */
export function addReminders(
  b: RoutineBuilder,
  { answers, start }: PlanContext,
  anchors: RoutineAnchors,
) {
  const work = answers.work;
  const lead = answers.reminders.leadMinutes;
  const sessionRefs = b.activities
    .filter((a) => CATEGORY_META[a.category].learning && a.ref !== 'morning_revision')
    .map((a) => a.ref);

  b.onActivity('sleep', 'sleep', 'activity_end', { bypassQuietHours: true });
  b.onActivity('morning_planning', 'daily_planning', 'activity_start', {
    title: 'Plan your day',
    body: 'Morning journal, top three tasks, and a look at today’s schedule.',
  });
  b.onActivity('morning_revision', 'start', 'activity_start');
  b.onActivity('get_ready', 'start', 'activity_start', {
    title: `Get ready for ${work.label.toLowerCase()}`,
  });
  b.onActivity('work', 'start', 'activity_start', { title: `${work.label} begins` });
  b.onActivity('after_work', 'start', 'activity_start', {
    title: `${work.label} done — rest & recharge`,
    body: 'Food, a walk, no screens if you can. Study starts in an hour.',
  });
  for (const ref of sessionRefs) {
    if (lead > 0) b.onActivity(ref, 'upcoming', 'activity_start', { offsetMinutes: -lead });
    b.onActivity(ref, 'start', 'activity_start');
    b.onActivity(ref, 'overdue', 'activity_end', { offsetMinutes: 20 });
  }
  b.onActivity('dinner_break', 'start', 'activity_start', { title: 'Break & dinner' });
  b.onActivity('personal_time', 'start', 'activity_start', {
    title: 'Personal time — you earned it',
    body: 'Study block done. Mark today’s sessions so your stats stay honest.',
  });
  b.onActivity('gym_weekday', 'upcoming', 'activity_start', { offsetMinutes: -15 });
  b.onActivity('gym_weekend', 'upcoming', 'activity_start', { offsetMinutes: -15 });

  // Bedtime-routine reminders follow the (possibly still shifting) bedtime, so they must not be
  // silenced by quiet hours: while bedtime moves from 2:30 toward 1:15, quiet hours that start
  // at 1:30 would otherwise mute exactly the reminders that drive the change.
  const bedtime = { bypassQuietHours: true };
  // The night journal opens a few minutes before bed (instead of scrolling); its text follows
  // the offset, which the journal settings change.
  b.onActivity('sleep', 'journal', 'activity_start', {
    ...bedtime,
    offsetMinutes: -DEFAULT_WIND_DOWN_MINUTES,
  });
  b.onActivity('wind_down', 'sleep', 'activity_start', {
    ...bedtime,
    title: 'Prepare for sleep',
    body: 'Screens down, lights low. Bedtime in 30 minutes.',
  });
  b.onActivity('sleep', 'sleep', 'activity_start', {
    ...bedtime,
    title: 'Target bedtime',
    body: 'Time to sleep. Tomorrow’s focus starts tonight.',
  });
  b.onActivity('weekly_review', 'weekly_review', 'activity_start');

  if (anchors.studyEnd) {
    b.remind('missed_digest', 'time', {
      time: addMinutesToTime(anchors.studyEnd, 5),
      recurrence: { freq: 'daily', interval: 1, startDate: start, endDate: null },
    });
  }
  b.remind('milestone', 'milestone', { time: anchors.planningStart, daysBefore: [7, 1, 0] });
}
