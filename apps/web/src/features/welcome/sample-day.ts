/*
 * The sample day the welcome page's pictures share, and how a time maps onto the day strips. The
 * strips run from 04:00 to 04:00, like the app's own day, so a time lands where the app would draw
 * it. The page's motion (./motion) reads the same values, so pictures and motion agree.
 */

export type Clock = readonly [hour: number, minute: number];

/** A time of day as a percentage along a 04:00–04:00 strip. */
export function dayPos([h, m]: Clock): number {
  return ((((h - 4 + 24) % 24) * 60 + m) / (24 * 60)) * 100;
}

/** Left offset and width, in %, of a block between two times (04:00 as an end means 100%). */
export function span(from: Clock, to: Clock) {
  const left = dayPos(from);
  const right = dayPos(to) || 100;
  return { left: `${left}%`, width: `${right - left}%` };
}

export const minutesOf = ([h, m]: Clock) => h * 60 + m;
export const clockOf = (minutes: number): Clock => {
  const total = ((Math.round(minutes) % 1440) + 1440) % 1440;
  return [Math.floor(total / 60), total % 60];
};

/** Minutes after midnight as "1:15 AM". */
export function clockLabel(minutes: number): string {
  const [h, m] = clockOf(minutes);
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
}

/** It is 6:50 PM on the Home preview, ten minutes before DSA practice. */
export const HOME_NOW: Clock = [18, 50];

/** Over six weeks bedtime moves from 2:30 to 1:15 AM; the routine picture shows where it ends. */
export const BEDTIME_FIRST: Clock = [2, 30];
export const BEDTIME_LAST: Clock = [1, 15];
export const BEDTIME_STEP_MINUTES = 15;

/** The lock screen's evening runs from 6:50 PM for 400 minutes, to 1:30 AM and quiet hours. */
export const LOCK_START_MINUTES = 18 * 60 + 50;
export const LOCK_SPAN_MINUTES = 400;

/** The plan picture: day 12 of 182, drawn as a ring of this radius. */
export const PLAN_DAY = 12;
export const PLAN_DAYS = 182;
export const PLAN_RING_RADIUS = 30;
