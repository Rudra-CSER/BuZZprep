import {
  DEFAULT_DAY_BOUNDARY_MINUTES,
  WEEKDAYS,
  type ActivityCategory,
  type TrackKind,
  type Weekday,
} from '../../constants';
import type { TrackBundle } from '../../schemas/bundle';
import type { OnboardingAnswers } from '../../schemas/onboarding';
import { toLogicalMinutes, type LocalDate, type LocalTime, type Recurrence } from '../../time';
import type { PlanTemplate } from '../catalog';

/** Generated routines use the default day boundary (04:00). */
export const DAY_BOUNDARY = DEFAULT_DAY_BOUNDARY_MINUTES;

/** Minutes since the start of the logical day, so 01:15 sorts after 23:00. */
export const lm = (t: LocalTime) => toLogicalMinutes(t, DAY_BOUNDARY);

export const round5 = (n: number) => Math.round(n / 5) * 5;

/** Learning tracks map one-to-one onto activity categories. */
export function categoryFor(kind: TrackKind): ActivityCategory {
  return kind;
}

export function recurrenceFor(days: readonly Weekday[], startDate: LocalDate): Recurrence {
  const unique = [...new Set(days)].sort((a, b) => a - b);
  if (unique.length === 7) return { freq: 'daily', interval: 1, startDate, endDate: null };
  return { freq: 'weekly', interval: 1, byWeekday: unique, startDate, endDate: null };
}

/** Evenly spread `count` days across the available ones (e.g. 3 → Mon, Wed, Fri). */
export function pickSpread(available: Weekday[], count: number): Weekday[] {
  if (count >= available.length) return [...available];
  const out: Weekday[] = [];
  const step = available.length / count;
  for (let i = 0; i < count; i++) out.push(available[Math.floor(i * step)]!);
  return out;
}

/** Everything the generation steps derive from the answers before placing activities. */
export interface PlanContext {
  answers: OnboardingAnswers;
  template: PlanTemplate;
  start: LocalDate;
  tracks: TrackBundle[];
  /** The highest-priority enabled track: it gets the main daily session. */
  primary: TrackBundle | null;
  /** The other enabled tracks, rotated through the second session. */
  secondary: TrackBundle[];
  days: {
    all: Weekday[];
    rest: Set<Weekday>;
    work: Weekday[];
    /** Days with an evening study block (working days, or Mon–Fri without a job). */
    weekdayStudy: Weekday[];
    /** Remaining non-rest days, used for a longer weekend session. */
    weekendStudy: Weekday[];
  };
}

export function createContext(answers: OnboardingAnswers, template: PlanTemplate): PlanContext {
  const tracks: TrackBundle[] = answers.tracks
    .filter((t) => t.enabled)
    .map((t) => {
      const base = template.tracks.find((x) => x.ref === t.ref);
      return base
        ? { ...base, title: t.title, kind: t.kind }
        : {
            ref: t.ref,
            title: t.title,
            kind: t.kind,
            description: null,
            color: null,
            resources: [],
            topics: [],
          };
    });
  const priority = (ref: string) => {
    const i = template.sessionPriority.indexOf(ref);
    return i === -1 ? 999 : i;
  };
  const ordered = [...tracks].sort((a, b) => priority(a.ref) - priority(b.ref));

  const all = [...WEEKDAYS];
  const rest = new Set(answers.restDays);
  const work = answers.work.enabled ? answers.work.days : [];
  const weekdayStudy = (answers.work.enabled ? work : all.filter((d) => d <= 5)).filter(
    (d) => !rest.has(d),
  );
  const weekendStudy = all.filter(
    (d) => !weekdayStudy.includes(d) && !rest.has(d) && !work.includes(d),
  );

  return {
    answers,
    template,
    start: answers.startDate,
    tracks,
    primary: ordered[0] ?? null,
    secondary: ordered.slice(1),
    days: { all, rest, work, weekdayStudy, weekendStudy },
  };
}
