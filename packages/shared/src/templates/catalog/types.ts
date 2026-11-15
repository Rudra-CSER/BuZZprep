import type { HabitBundle, TrackBundle } from '../../schemas/bundle';
import type { TemplateKey } from '../../schemas/onboarding';
import type { GoalType } from '../../schemas/profile';

export interface MilestoneTemplate {
  title: string;
  /** Position between start (0) and deadline (1). */
  at: number;
}

export interface PlanTemplate {
  key: TemplateKey;
  title: string;
  tagline: string;
  goalType: GoalType;
  defaultGoalTitle: string;
  defaultRole: string | null;
  durationMonths: number;
  tracks: TrackBundle[];
  /** Track refs in priority order; the first enabled one gets the main daily session. */
  sessionPriority: string[];
  milestones: MilestoneTemplate[];
  habits: HabitBundle[];
  defaults: { weekdayMinutes: number; weekendMinutes: number; morningRevisionMinutes: number };
}
