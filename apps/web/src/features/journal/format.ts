import { DateTime } from 'luxon';

/** "3:42" for a clip length. */
export function clipLength(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** "Fri 13 Nov" */
export function dayLabel(date: string): string {
  return DateTime.fromISO(date).toFormat('ccc d LLL');
}

/** "9 – 15 Nov" or "28 Oct – 3 Nov" */
export function weekRangeLabel(start: string, end: string): string {
  const a = DateTime.fromISO(start);
  const b = DateTime.fromISO(end);
  return a.month === b.month
    ? `${a.toFormat('d')} – ${b.toFormat('d LLL')}`
    : `${a.toFormat('d LLL')} – ${b.toFormat('d LLL')}`;
}
