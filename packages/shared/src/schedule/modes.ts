import type { ActivityCategory, ModeAction, ScheduleMode } from '../constants';
import type { ActivityTemplate } from './types';

/** Day modes (busy, low energy, recovery) and what they do to each activity. */

export interface ModeRule {
  byCategory: Partial<Record<ActivityCategory, ModeAction>>;
  /** Multiplier applied to "shorten"ed activities. */
  shortenFactor: number;
  /** Shortened activities never drop below this many minutes. */
  minMinutes: number;
}

export type ModeRules = Record<ScheduleMode, ModeRule>;

export const DEFAULT_MODE_RULES: ModeRules = {
  normal: { byCategory: {}, shortenFactor: 1, minMinutes: 0 },
  busy: {
    byCategory: {
      dsa: 'shorten',
      system_design: 'shorten',
      cs_fundamentals: 'shorten',
      custom: 'shorten',
      gym: 'optional',
      journaling: 'shorten',
    },
    shortenFactor: 0.5,
    minMinutes: 15,
  },
  low_energy: {
    byCategory: {
      dsa: 'shorten',
      system_design: 'shorten',
      cs_fundamentals: 'optional',
      custom: 'optional',
      gym: 'optional',
    },
    shortenFactor: 0.5,
    minMinutes: 15,
  },
  recovery: {
    byCategory: {
      dsa: 'skip',
      system_design: 'skip',
      cs_fundamentals: 'skip',
      custom: 'skip',
      gym: 'skip',
      journaling: 'shorten',
    },
    shortenFactor: 0.5,
    minMinutes: 10,
  },
};

export function resolveModeAction(
  activity: Pick<ActivityTemplate, 'essential' | 'category' | 'modeBehavior'>,
  mode: ScheduleMode,
  rules: ModeRules = DEFAULT_MODE_RULES,
): ModeAction {
  if (mode === 'normal' || activity.essential) return 'keep';
  return activity.modeBehavior?.[mode] ?? rules[mode].byCategory[activity.category] ?? 'keep';
}

export function shortenedDuration(minutes: number, rule: ModeRule): number {
  if (minutes <= 0) return minutes;
  const target = Math.round((minutes * rule.shortenFactor) / 5) * 5;
  return Math.min(minutes, Math.max(rule.minMinutes, target));
}
