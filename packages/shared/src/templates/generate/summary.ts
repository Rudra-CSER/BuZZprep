import { CATEGORY_META } from '../../constants';
import type { ConfigBundle } from '../../schemas/bundle';
import type { Recurrence } from '../../time';

export interface WeekSummary {
  studyMinutes: number;
  studySessions: number;
  gymSessions: number;
  remindersPerDay: number;
}

/** Rough weekly totals of a generated or edited schedule (for previews). */
export function summarizeWeek(bundle: Pick<ConfigBundle, 'schedule' | 'reminders'>): WeekSummary {
  const perWeek = (r: Recurrence) =>
    r.freq === 'daily' ? 7 / r.interval : r.freq === 'weekly' ? r.byWeekday.length / r.interval : 0;
  let studyMinutes = 0;
  let studySessions = 0;
  let gymSessions = 0;
  let remindersPerWeek = 0;
  const activities = bundle.schedule?.activities ?? [];
  for (const a of activities) {
    const n = perWeek(a.recurrence);
    if (CATEGORY_META[a.category].learning) {
      studyMinutes += n * a.durationMinutes;
      studySessions += n;
    }
    if (a.category === 'gym') gymSessions += n;
  }
  for (const r of bundle.reminders) {
    if (!r.enabled) continue;
    if (r.activityRef) {
      const a = activities.find((x) => x.ref === r.activityRef);
      if (a) remindersPerWeek += perWeek(a.recurrence);
    } else if (r.recurrence) remindersPerWeek += perWeek(r.recurrence);
  }
  return {
    studyMinutes: Math.round(studyMinutes),
    studySessions: Math.round(studySessions),
    gymSessions: Math.round(gymSessions),
    remindersPerDay: Math.round((remindersPerWeek / 7) * 10) / 10,
  };
}
