import { CATEGORY_META } from '../constants';
import { isActive, type Occurrence } from '../schedule';
import type { LocalDate } from '../time';

/** When tonight's journal opens: a few minutes before the night's sleep block starts. */

/** Sleep blocks shorter than this are naps or the wind-down routine, not the night's sleep. */
const MIN_NIGHT_SLEEP_MINUTES = 180;

export function isNightSleep(o: Pick<Occurrence, 'category' | 'durationMinutes'>): boolean {
  return o.category === 'sleep' && o.durationMinutes >= MIN_NIGHT_SLEEP_MINUTES;
}

/** The night's sleep occurrence that belongs to the logical `date`, if the schedule has one. */
export function findNightSleep(occurrences: Occurrence[], date: LocalDate): Occurrence | null {
  const candidates = occurrences
    .filter((o) => o.displayDate === date && isNightSleep(o) && isActive(o))
    .sort((a, b) => a.start.localeCompare(b.start));
  return candidates[0] ?? null;
}

export interface NightWindow {
  /** ISO instant of bedtime, or null when the schedule has no sleep block that night. */
  bedtime: string | null;
  /** ISO instant when the journal opens (bedtime − wind-down minutes). */
  opensAt: string | null;
}

export function nightWindow(sleep: Occurrence | null, windDownMinutes: number): NightWindow {
  if (!sleep) return { bedtime: null, opensAt: null };
  const opens = new Date(Date.parse(sleep.start) - windDownMinutes * 60_000);
  return { bedtime: sleep.start, opensAt: opens.toISOString() };
}

/** Learning sessions of the day, to remind the user what to talk about. */
export function studiedToday(occurrences: Occurrence[], date: LocalDate) {
  return occurrences
    .filter((o) => o.displayDate === date && CATEGORY_META[o.category].learning && isActive(o))
    .sort((a, b) => a.start.localeCompare(b.start))
    .map((o) => ({
      activityId: o.activityId,
      title: o.title,
      category: o.category,
      start: o.start,
      status: o.status,
      minutes: o.actualMinutes ?? o.durationMinutes,
    }));
}
