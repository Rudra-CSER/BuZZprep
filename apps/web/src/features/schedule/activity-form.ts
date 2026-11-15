// The activity editor's form state, and its conversion to and from the API's activity shape.

import {
  CATEGORY_META,
  minutesBetween,
  type ActivityCategory,
  type ActivityCreateInput,
  type Priority,
  type Recurrence,
  type Weekday,
} from '@buzzprep/shared';
import type { Activity } from '@/api/types';

export type RepeatKind = 'daily' | 'weekdays' | 'days' | 'interval' | 'once';

export interface FormState {
  title: string;
  description: string;
  category: ActivityCategory;
  startTime: string;
  endTime: string;
  repeat: RepeatKind;
  days: Weekday[];
  interval: number;
  onceDate: string;
  startDate: string;
  priority: Priority;
  essential: boolean;
  blocking: boolean;
  upcoming: boolean;
  upcomingMinutes: number;
  atStart: boolean;
  overdue: boolean;
  overdueMinutes: number;
}

/** Form values for an existing activity, or sensible defaults for a new one. */
export function fromActivity(a: Activity | null, today: string): FormState {
  const r = a?.recurrence;
  let repeat: RepeatKind = 'daily';
  let days: Weekday[] = [1, 2, 3, 4, 5];
  let interval = 2;
  if (r?.freq === 'once') repeat = 'once';
  else if (r?.freq === 'daily') repeat = r.interval > 1 ? 'interval' : 'daily';
  else if (r?.freq === 'weekly') {
    days = r.byWeekday;
    repeat = days.length === 5 && days.every((d, i) => d === i + 1) ? 'weekdays' : 'days';
  }
  if (r && r.freq === 'daily') interval = Math.max(2, r.interval);
  return {
    title: a?.title ?? '',
    description: a?.description ?? '',
    category: a?.category ?? 'dsa',
    startTime: a?.startTime ?? '19:00',
    endTime: a?.endTime ?? '20:00',
    repeat,
    days,
    interval,
    onceDate: r?.freq === 'once' ? r.date : today,
    startDate: r && r.freq !== 'once' ? r.startDate : today,
    priority: a?.priority ?? 'medium',
    essential: a?.essential ?? false,
    blocking: a?.blocking ?? CATEGORY_META[a?.category ?? 'dsa'].defaultBlocking,
    upcoming: a ? a.reminders.upcomingMinutes !== null : true,
    upcomingMinutes: a?.reminders.upcomingMinutes ?? 10,
    atStart: a ? a.reminders.atStart : true,
    overdue: a ? a.reminders.overdueMinutes !== null : true,
    overdueMinutes: a?.reminders.overdueMinutes ?? 20,
  };
}

/** The recurrence rule the form describes. */
export function toRecurrence(f: FormState): Recurrence {
  switch (f.repeat) {
    case 'once':
      return { freq: 'once', date: f.onceDate };
    case 'daily':
      return { freq: 'daily', interval: 1, startDate: f.startDate, endDate: null };
    case 'interval':
      return { freq: 'daily', interval: f.interval, startDate: f.startDate, endDate: null };
    case 'weekdays':
      return {
        freq: 'weekly',
        interval: 1,
        byWeekday: [1, 2, 3, 4, 5],
        startDate: f.startDate,
        endDate: null,
      };
    case 'days':
      return {
        freq: 'weekly',
        interval: 1,
        byWeekday: f.days,
        startDate: f.startDate,
        endDate: null,
      };
  }
}

/** Sets one field of the form. */
export type SetField = <K extends keyof FormState>(key: K, value: FormState[K]) => void;

/** The request body for creating or updating an activity from the form. */
export function toActivityInput(f: FormState): ActivityCreateInput {
  const trackable = CATEGORY_META[f.category].trackable;
  return {
    title: f.title,
    description: f.description || null,
    category: f.category,
    startTime: f.startTime,
    durationMinutes: minutesBetween(f.startTime, f.endTime),
    recurrence: toRecurrence(f),
    priority: f.priority,
    essential: f.essential,
    blocking: f.blocking,
    reminders: {
      upcomingMinutes: f.upcoming ? f.upcomingMinutes : null,
      atStart: f.atStart,
      overdueMinutes: f.overdue && trackable ? f.overdueMinutes : null,
    },
  };
}
