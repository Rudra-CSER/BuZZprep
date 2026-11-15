import { CORE_HABITS } from './building-blocks';
import type { PlanTemplate } from './types';

export const blank: PlanTemplate = {
  key: 'blank',
  title: 'Start from scratch',
  tagline: 'Only your routine — add tracks and activities yourself.',
  goalType: 'custom',
  defaultGoalTitle: 'My goal',
  defaultRole: null,
  durationMonths: 3,
  tracks: [],
  sessionPriority: [],
  milestones: [{ title: 'Goal reached', at: 1 }],
  habits: CORE_HABITS(),
  defaults: { weekdayMinutes: 60, weekendMinutes: 60, morningRevisionMinutes: 0 },
};
