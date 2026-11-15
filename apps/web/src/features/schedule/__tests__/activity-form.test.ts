import type { Weekday } from '@buzzprep/shared';
import { describe, expect, it } from 'vitest';
import type { Activity } from '@/api/types';
import { fromActivity, toActivityInput, toRecurrence } from '../activity-form';

const TODAY = '2026-11-13';

function activity(patch: Partial<Activity> = {}): Activity {
  return {
    id: 'a1',
    templateId: 't1',
    title: 'DSA practice',
    description: null,
    category: 'dsa',
    startTime: '19:00',
    endTime: '20:30',
    durationMinutes: 90,
    recurrence: { freq: 'daily', interval: 1, startDate: '2026-11-01', endDate: null },
    recurrenceLabel: 'Every day',
    priority: 'high',
    essential: false,
    blocking: true,
    trackId: null,
    color: null,
    modeBehavior: null,
    progression: null,
    notes: null,
    reminders: { upcomingMinutes: 10, atStart: true, overdueMinutes: 20 },
    ...patch,
  };
}

describe('activity form', () => {
  it('starts a new activity from defaults dated today', () => {
    const f = fromActivity(null, TODAY);
    expect(f).toMatchObject({ repeat: 'daily', startDate: TODAY, onceDate: TODAY, title: '' });
    expect(toRecurrence(f)).toEqual({
      freq: 'daily',
      interval: 1,
      startDate: TODAY,
      endDate: null,
    });
  });

  it('round-trips an existing activity unchanged', () => {
    const a = activity();
    const input = toActivityInput(fromActivity(a, TODAY));
    expect(input).toMatchObject({
      title: a.title,
      category: a.category,
      startTime: a.startTime,
      durationMinutes: 90,
      recurrence: a.recurrence,
      priority: a.priority,
      blocking: true,
      reminders: a.reminders,
    });
  });

  it('recognises weekdays, specific days, intervals and one-offs', () => {
    const weekly = (byWeekday: Weekday[]) =>
      activity({
        recurrence: { freq: 'weekly', interval: 1, byWeekday, startDate: TODAY, endDate: null },
      });
    expect(fromActivity(weekly([1, 2, 3, 4, 5]), TODAY).repeat).toBe('weekdays');
    expect(fromActivity(weekly([6, 7]), TODAY)).toMatchObject({ repeat: 'days', days: [6, 7] });
    const every3 = activity({
      recurrence: { freq: 'daily', interval: 3, startDate: TODAY, endDate: null },
    });
    expect(fromActivity(every3, TODAY)).toMatchObject({ repeat: 'interval', interval: 3 });
    const once = activity({ recurrence: { freq: 'once', date: '2026-12-01' } });
    expect(toRecurrence(fromActivity(once, TODAY))).toEqual({ freq: 'once', date: '2026-12-01' });
  });

  it('drops the not-done reminder for categories that are not checked off', () => {
    const f = { ...fromActivity(activity(), TODAY), category: 'sleep' as const };
    expect(toActivityInput(f).reminders?.overdueMinutes).toBeNull();
  });

  it('turns a switched-off reminder into null and an end before the start into an overnight duration', () => {
    const f = {
      ...fromActivity(activity(), TODAY),
      upcoming: false,
      startTime: '23:30',
      endTime: '07:00',
    };
    const input = toActivityInput(f);
    expect(input.reminders?.upcomingMinutes).toBeNull();
    expect(input.durationMinutes).toBe(450);
  });
});
