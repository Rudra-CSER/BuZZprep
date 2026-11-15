import type { ReminderKind } from '../constants';
import type { LocalDate } from '../time';

/** Where tapping a notification takes the user. */

export function occurrenceUrl(activityId: string, date: LocalDate): string {
  return `/schedule/occurrence/${encodeURIComponent(activityId)}/${date}`;
}

/** Tonight's journal session for the logical day that is ending. */
export function journalTonightUrl(date: LocalDate): string {
  return `/journal/tonight?date=${date}`;
}

export function journalWeekUrl(weekStart: LocalDate): string {
  return `/journal/week/${weekStart}`;
}

export const KIND_URL: Partial<Record<ReminderKind, string>> = {
  missed_digest: '/schedule/review',
  daily_planning: '/',
  journal: '/journal',
  weekly_review: '/journal?type=weekly',
  milestone: '/profile/plan',
};
