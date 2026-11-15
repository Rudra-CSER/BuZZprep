import { CATEGORY_META, MODE_META, type ReminderKind } from '../constants';
import type { Occurrence } from '../schedule';
import { formatTimeLabel, localTimeOf, parseTime } from '../time';
import type { ReminderRule } from './types';

/** Titles and bodies of the notifications the planner produces. */

export function timeRangeLabel(o: Pick<Occurrence, 'start' | 'end'>, zone: string, hour12 = true) {
  const s = formatTimeLabel(localTimeOf(o.start, zone), hour12);
  if (o.start === o.end) return s;
  return `${s} – ${formatTimeLabel(localTimeOf(o.end, zone), hour12)}`;
}

export function activityText(rule: ReminderRule, occ: Occurrence, hour12: boolean) {
  const range = occ.start === occ.end ? '' : rangeFromOccurrence(occ, hour12);
  const category = CATEGORY_META[occ.category].label;
  const modeNote =
    occ.modeAction === 'shorten'
      ? ` · shortened for ${MODE_META[occ.mode].label}`
      : occ.modeAction === 'optional'
        ? ` · optional today`
        : '';
  const details = [range, category].filter(Boolean).join(' · ') + modeNote;

  switch (rule.kind) {
    case 'upcoming': {
      const minutes = Math.abs(rule.offsetMinutes);
      return { title: `${occ.title} in ${minutes} min`, body: details };
    }
    case 'overdue':
      return {
        title: `Did you finish ${occ.title}?`,
        body: 'Mark it done, skip it, or pick a new slot — whatever is true.',
      };
    case 'sleep':
      if (rule.anchor === 'activity_end' && occ.category === 'sleep') {
        return { title: 'Good morning — time to get up', body: 'Your day starts now.' };
      }
      return { title: occ.title, body: details };
    default:
      return {
        title: rule.anchor === 'activity_end' ? `${occ.title} is over` : `Time for ${occ.title}`,
        body: details,
      };
  }
}

function rangeFromOccurrence(occ: Occurrence, hour12: boolean): string {
  const start = formatTimeLabel(occ.startTime, hour12);
  const endMinutes = parseTime(occ.startTime) + occ.durationMinutes;
  return `${start} – ${formatTimeLabel(endMinutes, hour12)}`;
}

export function timeText(kind: ReminderKind): { title: string; body: string } {
  switch (kind) {
    case 'missed_digest':
      return {
        title: 'Some sessions need a decision',
        body: 'Mark them done, skip them, or move them to a free slot.',
      };
    case 'daily_planning':
      return { title: 'Plan your day', body: 'Check today’s schedule and pick your top three.' };
    case 'journal':
      return {
        title: 'Evening reflection',
        body: 'Two minutes: what went well, and what to change tomorrow?',
      };
    case 'weekly_review':
      return { title: 'Weekly review', body: 'See how the week went and plan the next one.' };
    case 'sleep':
      return { title: 'Time to wind down', body: 'Screens down, lights low.' };
    default:
      return { title: 'Reminder', body: '' };
  }
}
