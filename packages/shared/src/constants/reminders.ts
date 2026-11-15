/** Kinds of reminders and what they are anchored to. */

export const REMINDER_KINDS = [
  'upcoming',
  'start',
  'overdue',
  'missed_digest',
  'daily_planning',
  'journal',
  'sleep',
  'weekly_review',
  'milestone',
  'custom',
] as const;
export type ReminderKind = (typeof REMINDER_KINDS)[number];

export const REMINDER_KIND_META: Record<ReminderKind, { label: string; description: string }> = {
  upcoming: { label: 'Upcoming activity', description: 'A few minutes before something starts.' },
  start: { label: 'Activity starting', description: 'When an activity begins.' },
  overdue: {
    label: 'Overdue activity',
    description: 'After an activity ends without being marked done.',
  },
  missed_digest: {
    label: 'Missed sessions',
    description: 'A daily nudge to resolve sessions you missed.',
  },
  daily_planning: { label: 'Daily planning', description: 'Plan the day and check the agenda.' },
  journal: { label: 'Journal', description: 'Morning intentions and evening reflection.' },
  sleep: { label: 'Sleep schedule', description: 'Wind-down, bedtime and wake-up.' },
  weekly_review: { label: 'Weekly review', description: 'Review the week and plan the next.' },
  milestone: { label: 'Milestones', description: 'Before a milestone is due.' },
  custom: { label: 'Custom', description: 'Reminders you created yourself.' },
};

export const REMINDER_ANCHORS = ['activity_start', 'activity_end', 'time', 'milestone'] as const;
export type ReminderAnchor = (typeof REMINDER_ANCHORS)[number];
