import { DateTime } from 'luxon';
import type { Weekday } from '../constants';

/**
 * Time model
 * ----------
 * - `LocalDate` ("YYYY-MM-DD") and `LocalTime` ("HH:mm") are wall-clock values in the user's
 *   IANA timezone. Schedules are stored this way so they survive DST and timezone changes.
 * - A *logical day* starts at `dayBoundaryMinutes` after local midnight (default 04:00).
 *   An activity at 01:15 therefore belongs to the evening of the previous calendar day,
 *   which matches how people with late bedtimes think about "today".
 * - Concrete instants (for reminders, sorting, overlap checks) are computed with Luxon from
 *   (logical date, local time, zone) — never by adding fixed offsets — so DST is respected.
 */

export type LocalDate = string;
export type LocalTime = string;

export interface TimeContext {
  /** IANA timezone, e.g. "Asia/Kolkata". */
  zone: string;
  /** Minutes after local midnight at which a logical day begins (0–720). */
  dayBoundaryMinutes: number;
}

export const MINUTES_PER_DAY = 1440;
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isLocalTime(value: string): boolean {
  return TIME_RE.test(value);
}

export function isLocalDate(value: string): boolean {
  if (!DATE_RE.test(value)) return false;
  return DateTime.fromISO(value, { zone: 'utc' }).isValid;
}

export function isValidZone(zone: string): boolean {
  if (!zone) return false;
  return DateTime.now().setZone(zone).isValid;
}

/** "HH:mm" → minutes since local midnight. */
export function parseTime(time: LocalTime): number {
  const match = TIME_RE.exec(time);
  if (!match) throw new Error(`Invalid time "${time}" (expected HH:mm)`);
  return Number(match[1]) * 60 + Number(match[2]);
}

/** Minutes since midnight (any integer, wrapped into a day) → "HH:mm". */
export function formatTime(minutes: number): LocalTime {
  const m = mod(Math.round(minutes), MINUTES_PER_DAY);
  const h = Math.floor(m / 60);
  return `${String(h).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

export function addMinutesToTime(time: LocalTime, minutes: number): LocalTime {
  return formatTime(parseTime(time) + minutes);
}

/** Position of a wall-clock time inside the logical day (0 = day boundary). */
export function toLogicalMinutes(time: LocalTime | number, boundaryMinutes: number): number {
  const m = typeof time === 'number' ? time : parseTime(time);
  return mod(m - boundaryMinutes, MINUTES_PER_DAY);
}

export function fromLogicalMinutes(logicalMinutes: number, boundaryMinutes: number): LocalTime {
  return formatTime(logicalMinutes + boundaryMinutes);
}

/** Duration between two wall-clock times, wrapping past midnight (01:15 → 08:45 = 450). */
export function minutesBetween(start: LocalTime, end: LocalTime): number {
  return mod(parseTime(end) - parseTime(start), MINUTES_PER_DAY);
}

export function addDays(date: LocalDate, days: number): LocalDate {
  return toUtcDate(date).plus({ days }).toISODate()!;
}

/** Whole days from `a` to `b` (positive when b is later). */
export function diffDays(a: LocalDate, b: LocalDate): number {
  return Math.round(toUtcDate(b).diff(toUtcDate(a), 'days').days);
}

export function isoWeekday(date: LocalDate): Weekday {
  return toUtcDate(date).weekday as Weekday;
}

export function startOfWeek(date: LocalDate, weekStartsOn: Weekday = 1): LocalDate {
  const offset = mod(isoWeekday(date) - weekStartsOn, 7);
  return addDays(date, -offset);
}

export function startOfMonth(date: LocalDate): LocalDate {
  return `${date.slice(0, 7)}-01`;
}

export function endOfMonth(date: LocalDate): LocalDate {
  return toUtcDate(date).endOf('month').toISODate()!;
}

export function daysInMonth(date: LocalDate): number {
  return toUtcDate(date).daysInMonth ?? 30;
}

/** Calendar months from `a` to `b`, ignoring the day of month. */
export function monthsBetween(a: LocalDate, b: LocalDate): number {
  const [ay, am] = [Number(a.slice(0, 4)), Number(a.slice(5, 7))];
  const [by, bm] = [Number(b.slice(0, 4)), Number(b.slice(5, 7))];
  return (by - ay) * 12 + (bm - am);
}

export function eachDate(from: LocalDate, to: LocalDate): LocalDate[] {
  const out: LocalDate[] = [];
  const total = diffDays(from, to);
  for (let i = 0; i <= total; i++) out.push(addDays(from, i));
  return out;
}

export function minDate(a: LocalDate, b: LocalDate): LocalDate {
  return a <= b ? a : b;
}

export function maxDate(a: LocalDate, b: LocalDate): LocalDate {
  return a >= b ? a : b;
}

/** Wall-clock time on a *calendar* date in `zone`. DST gaps are resolved forward by Luxon. */
export function zonedDateTime(calendarDate: LocalDate, minutesSinceMidnight: number, zone: string) {
  const base = toUtcDate(calendarDate);
  const extraDays = Math.floor(minutesSinceMidnight / MINUTES_PER_DAY);
  const m = mod(minutesSinceMidnight, MINUTES_PER_DAY);
  const day = base.plus({ days: extraDays });
  return DateTime.fromObject(
    { year: day.year, month: day.month, day: day.day, hour: Math.floor(m / 60), minute: m % 60 },
    { zone },
  );
}

/** Calendar date on which a time of logical day `date` actually happens. */
export function calendarDateFor(date: LocalDate, time: LocalTime, ctx: TimeContext): LocalDate {
  return parseTime(time) < ctx.dayBoundaryMinutes ? addDays(date, 1) : date;
}

/** Instant at which logical day `date` reaches wall-clock `time`. */
export function logicalDateTime(date: LocalDate, time: LocalTime, ctx: TimeContext): DateTime {
  return zonedDateTime(calendarDateFor(date, time, ctx), parseTime(time), ctx.zone);
}

export function logicalDayStart(date: LocalDate, ctx: TimeContext): DateTime {
  return zonedDateTime(date, ctx.dayBoundaryMinutes, ctx.zone);
}

export function logicalDayEnd(date: LocalDate, ctx: TimeContext): DateTime {
  return logicalDayStart(addDays(date, 1), ctx);
}

export type InstantLike = Date | string | number | DateTime;

export function toDateTime(instant: InstantLike, zone?: string): DateTime {
  let dt: DateTime;
  if (DateTime.isDateTime(instant)) dt = instant;
  else if (instant instanceof Date) dt = DateTime.fromJSDate(instant);
  else if (typeof instant === 'number') dt = DateTime.fromMillis(instant);
  else dt = DateTime.fromISO(instant, { setZone: true });
  return zone ? dt.setZone(zone) : dt;
}

/** Logical date that contains `instant` (wall-clock based, so DST-safe). */
export function logicalDateOf(instant: InstantLike, ctx: TimeContext): LocalDate {
  const local = toDateTime(instant, ctx.zone);
  const minutes = local.hour * 60 + local.minute;
  const calendar = local.toISODate()!;
  return minutes < ctx.dayBoundaryMinutes ? addDays(calendar, -1) : calendar;
}

/** Wall-clock "HH:mm" of an instant in the user's zone. */
export function localTimeOf(instant: InstantLike, zone: string): LocalTime {
  const local = toDateTime(instant, zone);
  return formatTime(local.hour * 60 + local.minute);
}

export function toISO(dt: DateTime): string {
  return dt.toUTC().toISO()!;
}

/** "19:00" → "7:00 PM" (or "19:00" in 24h mode). */
export function formatTimeLabel(time: LocalTime | number, hour12 = true): string {
  const m = typeof time === 'number' ? mod(time, MINUTES_PER_DAY) : parseTime(time);
  const h = Math.floor(m / 60);
  const min = String(m % 60).padStart(2, '0');
  if (!hour12) return `${String(h).padStart(2, '0')}:${min}`;
  const suffix = h < 12 ? 'AM' : 'PM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${min} ${suffix}`;
}

export function formatDuration(minutes: number): string {
  if (minutes <= 0) return '0m';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

export function roundUpToStep(ms: number, stepMinutes: number): number {
  const step = stepMinutes * 60_000;
  return Math.ceil(ms / step) * step;
}

function toUtcDate(date: LocalDate): DateTime {
  const dt = DateTime.fromISO(date, { zone: 'utc' });
  if (!dt.isValid) throw new Error(`Invalid date "${date}" (expected YYYY-MM-DD)`);
  return dt;
}

export function mod(n: number, m: number): number {
  return ((n % m) + m) % m;
}
