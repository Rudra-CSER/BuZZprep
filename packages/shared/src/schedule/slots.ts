import { DateTime } from 'luxon';
import { isActive } from './status';
import type { Occurrence } from './types';
import {
  addDays,
  diffDays,
  formatTimeLabel,
  localTimeOf,
  logicalDateOf,
  logicalDateTime,
  logicalDayEnd,
  logicalDayStart,
  minutesBetween,
  roundUpToStep,
  toISO,
  type LocalDate,
  type LocalTime,
  type TimeContext,
} from '../time';

export interface Interval {
  start: number;
  end: number;
}

export interface DailyRange {
  start: LocalTime;
  end: LocalTime;
}

export interface SlotSuggestion {
  date: LocalDate;
  startTime: LocalTime;
  durationMinutes: number;
  start: string;
  end: string;
  label: string;
  reason: 'earliest' | 'later_today' | 'same_time' | 'next_free';
}

export function mergeIntervals(intervals: Interval[]): Interval[] {
  const sorted = intervals.filter((i) => i.end > i.start).sort((a, b) => a.start - b.start);
  const out: Interval[] = [];
  for (const i of sorted) {
    const last = out[out.length - 1];
    if (last && i.start <= last.end) last.end = Math.max(last.end, i.end);
    else out.push({ ...i });
  }
  return out;
}

/** Free gaps inside [windowStart, windowEnd) that are at least `minMinutes` long. */
export function freeGaps(
  busy: Interval[],
  windowStart: number,
  windowEnd: number,
  minMinutes = 0,
): Interval[] {
  const gaps: Interval[] = [];
  let cursor = windowStart;
  for (const b of mergeIntervals(busy)) {
    if (b.end <= cursor) continue;
    if (b.start >= windowEnd) break;
    if (b.start > cursor) gaps.push({ start: cursor, end: Math.min(b.start, windowEnd) });
    cursor = Math.max(cursor, b.end);
  }
  if (cursor < windowEnd) gaps.push({ start: cursor, end: windowEnd });
  return gaps.filter((g) => g.end - g.start >= minMinutes * 60_000);
}

/** Expand a daily wall-clock range (may wrap midnight) into concrete intervals for each day. */
export function dailyRangeIntervals(
  range: DailyRange,
  from: LocalDate,
  to: LocalDate,
  ctx: TimeContext,
): Interval[] {
  const out: Interval[] = [];
  const length = minutesBetween(range.start, range.end);
  if (length === 0) return out;
  // Start one day early so a range that began the previous evening is included.
  for (let d = addDays(from, -1); d <= to; d = addDays(d, 1)) {
    const start = logicalDateTime(d, range.start, ctx);
    out.push({ start: start.toMillis(), end: start.plus({ minutes: length }).toMillis() });
  }
  return out;
}

export interface SuggestInput {
  /** The occurrence to move (only its key, duration and original time are used). */
  target: Pick<Occurrence, 'key' | 'durationMinutes' | 'startTime'>;
  /** Agenda covering at least [today − 1, today + horizonDays] so overnight blocks are seen. */
  agenda: Occurrence[];
  now: number;
  ctx: TimeContext;
  horizonDays?: number;
  /** Extra daily ranges to avoid (e.g. quiet hours). */
  avoid?: DailyRange[];
  stepMinutes?: number;
  maxSuggestions?: number;
}

/**
 * Suggest free slots for a missed or postponed session.
 * Never overlaps blocking activities (sleep, job, essentials, other sessions) or `avoid`
 * ranges; non-blocking time such as "Personal time" is considered available.
 */
export function suggestSlots(input: SuggestInput): SlotSuggestion[] {
  const step = input.stepMinutes ?? 15;
  const horizon = Math.max(1, input.horizonDays ?? 3);
  const max = input.maxSuggestions ?? 4;
  const duration = Math.max(5, input.target.durationMinutes);
  const { ctx } = input;
  const today = logicalDateOf(input.now, ctx);
  const lastDay = addDays(today, horizon - 1);

  const busy: Interval[] = input.agenda
    .filter((o) => o.blocking && isActive(o) && o.key !== input.target.key)
    .map((o) => ({ start: Date.parse(o.start), end: Date.parse(o.end) }));
  for (const range of input.avoid ?? [])
    busy.push(...dailyRangeIntervals(range, today, lastDay, ctx));
  const merged = mergeIntervals(busy);

  const windowStart = roundUpToStep(input.now, step);
  const fits = (start: number) => {
    const end = start + duration * 60_000;
    return !merged.some((b) => b.start < end && b.end > start);
  };

  const picks: SlotSuggestion[] = [];
  const add = (startMs: number, reason: SlotSuggestion['reason']) => {
    if (picks.length >= max || picks.some((p) => Date.parse(p.start) === startMs)) return;
    picks.push(toSuggestion(startMs, duration, reason, today, ctx));
  };

  for (let day = today; day <= lastDay; day = addDays(day, 1)) {
    const dayStart = Math.max(windowStart, logicalDayStart(day, ctx).toMillis());
    const dayEnd = logicalDayEnd(day, ctx).toMillis();
    const candidates = firstFits(freeGaps(merged, dayStart, dayEnd, duration), duration, step, 3);

    if (day === today) {
      if (candidates[0] !== undefined) add(candidates[0], 'earliest');
      const later = candidates.find(
        (c) => candidates[0] !== undefined && c - candidates[0] >= 90 * 60_000,
      );
      if (later !== undefined) add(later, 'later_today');
      continue;
    }
    const sameTime = logicalDateTime(day, input.target.startTime, ctx).toMillis();
    if (sameTime >= windowStart && fits(sameTime)) add(sameTime, 'same_time');
    else if (candidates[0] !== undefined) add(candidates[0], 'next_free');
  }

  return picks.sort((a, b) => a.start.localeCompare(b.start));
}

/** Up to `count` aligned start times spread across the gaps (first fit of each gap, then later fits). */
function firstFits(gaps: Interval[], duration: number, step: number, count: number): number[] {
  const out: number[] = [];
  for (const gap of gaps) {
    let s = roundUpToStep(gap.start, step);
    while (s + duration * 60_000 <= gap.end && out.length < count * 4) {
      out.push(s);
      s += 60 * 60_000; // offer alternatives an hour apart inside a long gap
    }
  }
  return out;
}

function toSuggestion(
  startMs: number,
  duration: number,
  reason: SlotSuggestion['reason'],
  today: LocalDate,
  ctx: TimeContext,
): SlotSuggestion {
  const date = logicalDateOf(startMs, ctx);
  const startTime = localTimeOf(startMs, ctx.zone);
  const start = DateTime.fromMillis(startMs);
  const offset = diffDays(today, date);
  const dayLabel =
    offset === 0
      ? 'Today'
      : offset === 1
        ? 'Tomorrow'
        : DateTime.fromISO(date).toFormat('ccc d LLL');
  return {
    date,
    startTime,
    durationMinutes: duration,
    start: toISO(start),
    end: toISO(start.plus({ minutes: duration })),
    label: `${dayLabel} · ${formatTimeLabel(startTime)}`,
    reason,
  };
}
