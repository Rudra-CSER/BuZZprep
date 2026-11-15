/** Activities, priorities, day modes and the calendar. */

export const ACTIVITY_CATEGORIES = [
  'dsa',
  'system_design',
  'cs_fundamentals',
  'job',
  'gym',
  'sleep',
  'food',
  'personal',
  'journaling',
  'rest',
  'custom',
] as const;
export type ActivityCategory = (typeof ACTIVITY_CATEGORIES)[number];

export interface CategoryMeta {
  label: string;
  /** Learning categories feed study-time stats. */
  learning: boolean;
  /** Counted in daily completion % (things you set out to do, not passive blocks). */
  trackable: boolean;
  /** Default for "other things may not be scheduled over this". */
  defaultBlocking: boolean;
}

export const CATEGORY_META: Record<ActivityCategory, CategoryMeta> = {
  dsa: { label: 'DSA', learning: true, trackable: true, defaultBlocking: true },
  system_design: { label: 'System Design', learning: true, trackable: true, defaultBlocking: true },
  cs_fundamentals: {
    label: 'CS Fundamentals',
    learning: true,
    trackable: true,
    defaultBlocking: true,
  },
  job: { label: 'Job', learning: false, trackable: false, defaultBlocking: true },
  gym: { label: 'Gym', learning: false, trackable: true, defaultBlocking: true },
  sleep: { label: 'Sleep', learning: false, trackable: false, defaultBlocking: true },
  food: { label: 'Food', learning: false, trackable: false, defaultBlocking: true },
  personal: { label: 'Personal', learning: false, trackable: false, defaultBlocking: false },
  journaling: { label: 'Journaling', learning: false, trackable: true, defaultBlocking: true },
  rest: { label: 'Rest', learning: false, trackable: false, defaultBlocking: true },
  custom: { label: 'Custom', learning: true, trackable: true, defaultBlocking: true },
};

export const PRIORITIES = ['low', 'medium', 'high', 'critical'] as const;
export type Priority = (typeof PRIORITIES)[number];

export const SCHEDULE_MODES = ['normal', 'busy', 'low_energy', 'recovery'] as const;
export type ScheduleMode = (typeof SCHEDULE_MODES)[number];

export const MODE_META: Record<ScheduleMode, { label: string; description: string }> = {
  normal: { label: 'Normal', description: 'Your full schedule, as planned.' },
  busy: {
    label: 'Busy workday',
    description: 'Study blocks are halved, gym becomes optional. Essentials stay.',
  },
  low_energy: {
    label: 'Low energy',
    description: 'Shorter, lighter sessions. Anything heavy becomes optional.',
  },
  recovery: {
    label: 'Recovery',
    description: 'Rest first. Study and gym are paused, no overdue nagging.',
  },
};

/** What a schedule mode does to one activity. */
export const MODE_ACTIONS = ['keep', 'shorten', 'optional', 'skip'] as const;
export type ModeAction = (typeof MODE_ACTIONS)[number];

/** ISO weekday numbers: 1 = Monday … 7 = Sunday. */
export const WEEKDAYS = [1, 2, 3, 4, 5, 6, 7] as const;
export type Weekday = (typeof WEEKDAYS)[number];
export const WEEKDAY_SHORT: Record<Weekday, string> = {
  1: 'Mon',
  2: 'Tue',
  3: 'Wed',
  4: 'Thu',
  5: 'Fri',
  6: 'Sat',
  7: 'Sun',
};

/** Minutes after a session ends before it is considered "missed" (needs review). */
export const DEFAULT_MISSED_GRACE_MINUTES = 30;

/** Default hour (local) at which a "logical day" rolls over. 04:00 keeps 1 AM bedtimes in "today". */
export const DEFAULT_DAY_BOUNDARY_MINUTES = 4 * 60;
