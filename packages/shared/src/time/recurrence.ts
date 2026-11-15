import { DateTime } from 'luxon';
import { WEEKDAY_SHORT, type Weekday } from '../constants';
import {
  addDays,
  daysInMonth,
  diffDays,
  isoWeekday,
  monthsBetween,
  startOfWeek,
  type LocalDate,
} from './local-time';

/**
 * A deliberately small recurrence model (instead of full RFC 5545 RRULE): it covers
 * every schedule this app needs, is trivial to validate, and is easy to reason about in
 * tests. Dates are *logical* dates (see time.ts).
 */
export type Recurrence =
  | { freq: 'once'; date: LocalDate }
  | { freq: 'daily'; interval: number; startDate: LocalDate; endDate?: LocalDate | null }
  | {
      freq: 'weekly';
      interval: number;
      byWeekday: Weekday[];
      startDate: LocalDate;
      endDate?: LocalDate | null;
    }
  | {
      freq: 'monthly';
      interval: number;
      /** Days of month; -1 means "last day of the month". */
      byMonthDay: number[];
      startDate: LocalDate;
      endDate?: LocalDate | null;
    };

export function occursOn(rule: Recurrence, date: LocalDate): boolean {
  if (rule.freq === 'once') return rule.date === date;
  if (date < rule.startDate) return false;
  if (rule.endDate && date > rule.endDate) return false;
  const interval = Math.max(1, Math.floor(rule.interval || 1));

  switch (rule.freq) {
    case 'daily':
      return diffDays(rule.startDate, date) % interval === 0;
    case 'weekly': {
      if (!rule.byWeekday.includes(isoWeekday(date))) return false;
      const weeks = Math.round(diffDays(startOfWeek(rule.startDate), startOfWeek(date)) / 7);
      return weeks % interval === 0;
    }
    case 'monthly': {
      if (monthsBetween(rule.startDate, date) % interval !== 0) return false;
      const day = Number(date.slice(8, 10));
      const last = daysInMonth(date);
      return rule.byMonthDay.some((d) => d === day || (d === -1 && day === last));
    }
  }
}

/** First date on/after `from` on which the rule fires, scanning at most `maxDays`. */
export function nextOccurrenceDate(
  rule: Recurrence,
  from: LocalDate,
  maxDays = 400,
): LocalDate | null {
  if (rule.freq === 'once') return rule.date >= from ? rule.date : null;
  let date = from < rule.startDate ? rule.startDate : from;
  for (let i = 0; i <= maxDays; i++) {
    if (rule.endDate && date > rule.endDate) return null;
    if (occursOn(rule, date)) return date;
    date = addDays(date, 1);
  }
  return null;
}

export function recurrenceStart(rule: Recurrence): LocalDate {
  return rule.freq === 'once' ? rule.date : rule.startDate;
}

export function recurrenceEnd(rule: Recurrence): LocalDate | null {
  return rule.freq === 'once' ? rule.date : (rule.endDate ?? null);
}

const WEEKDAY_SETS: Array<{ days: Weekday[]; label: string }> = [
  { days: [1, 2, 3, 4, 5, 6, 7], label: 'Every day' },
  { days: [1, 2, 3, 4, 5], label: 'Weekdays' },
  { days: [6, 7], label: 'Weekends' },
];

export function describeRecurrence(rule: Recurrence): string {
  switch (rule.freq) {
    case 'once':
      return `Once · ${DateTime.fromISO(rule.date).toFormat('ccc, d LLL')}`;
    case 'daily':
      return rule.interval > 1 ? `Every ${rule.interval} days` : 'Every day';
    case 'weekly': {
      const sorted = [...new Set(rule.byWeekday)].sort((a, b) => a - b);
      const named = WEEKDAY_SETS.find(
        (set) => set.days.length === sorted.length && set.days.every((d, i) => d === sorted[i]),
      );
      const days = named?.label ?? sorted.map((d) => WEEKDAY_SHORT[d]).join(', ');
      return rule.interval > 1 ? `Every ${rule.interval} weeks · ${days}` : days;
    }
    case 'monthly': {
      const days = rule.byMonthDay.map((d) => (d === -1 ? 'last day' : ordinal(d))).join(', ');
      return rule.interval > 1
        ? `Every ${rule.interval} months on the ${days}`
        : `Monthly on the ${days}`;
    }
  }
}

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0]!);
}
