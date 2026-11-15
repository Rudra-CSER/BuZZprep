import {
  diffDays,
  formatDuration,
  formatTimeLabel,
  localTimeOf,
  parseTime,
  type LocalDate,
  type Occurrence,
} from '@buzzprep/shared';
import { DateTime } from 'luxon';

export { formatDuration };

export function timeLabel(time: string | number, hour12 = true) {
  return formatTimeLabel(time, hour12);
}

/** "7:00 PM" style label of an ISO instant in the user's zone. */
export function instantTime(iso: string, zone: string, hour12 = true) {
  return formatTimeLabel(localTimeOf(iso, zone), hour12);
}

export function occurrenceRange(
  o: Pick<Occurrence, 'startTime' | 'durationMinutes'>,
  hour12 = true,
) {
  const start = formatTimeLabel(o.startTime, hour12);
  if (o.durationMinutes === 0) return start;
  return `${start} – ${formatTimeLabel(parseTime(o.startTime) + o.durationMinutes, hour12)}`;
}

/** "Today", "Tomorrow", "Yesterday" or "Mon 16 Nov". */
export function relativeDay(date: LocalDate, today: LocalDate) {
  const d = diffDays(today, date);
  if (d === 0) return 'Today';
  if (d === 1) return 'Tomorrow';
  if (d === -1) return 'Yesterday';
  return DateTime.fromISO(date).toFormat('ccc d LLL');
}

export function longDate(date: LocalDate) {
  return DateTime.fromISO(date).toFormat('cccc, d LLLL');
}

export function shortDate(date: LocalDate) {
  return DateTime.fromISO(date).toFormat('d LLL');
}

export function minutesUntil(iso: string, now: number) {
  return Math.round((Date.parse(iso) - now) / 60_000);
}

/** "in 2h 5m" / "5m ago" — for countdowns in the Now panel. */
export function relativeMinutes(minutes: number) {
  if (minutes === 0) return 'now';
  const abs = formatDuration(Math.abs(minutes));
  return minutes > 0 ? `in ${abs}` : `${abs} ago`;
}

export function hoursLabel(minutes: number) {
  if (minutes < 60) return `${minutes}m`;
  const h = minutes / 60;
  return `${Number.isInteger(h) ? h : h.toFixed(1)}h`;
}

export function browserTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}
