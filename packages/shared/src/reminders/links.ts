import type { ReminderKind } from '../constants';
import type { LocalDate } from '../time';

/** Where tapping a notification takes the user. */

export function occurrenceUrl(activityId: string, date: LocalDate): string {
  return `/schedule/occurrence/${encodeURIComponent(activityId)}/${date}`;
}

export const KIND_URL: Partial<Record<ReminderKind, string>> = {
  missed_digest: '/schedule/review',
  daily_planning: '/',
  journal: '/journal',
  weekly_review: '/journal?type=weekly',
  milestone: '/profile/plan',
};
