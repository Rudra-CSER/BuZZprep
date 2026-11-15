import { type LocalTime, parseTime } from '../time';
import type { NotificationPreferences } from './types';

/** Notification preferences: defaults and quiet hours. */

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  enabled: true,
  quietHours: { enabled: true, start: '01:30', end: '08:30' },
  kinds: {},
  mutedCategories: [],
  defaultSnoozeMinutes: 10,
  hour12: true,
};

export function isWithinDailyRange(time: LocalTime, start: LocalTime, end: LocalTime): boolean {
  const t = parseTime(time);
  const s = parseTime(start);
  const e = parseTime(end);
  if (s === e) return false;
  return s < e ? t >= s && t < e : t >= s || t < e;
}
