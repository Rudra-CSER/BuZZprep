import {
  CORE_HABITS,
  csFundamentalsTrack,
  dsaTrack,
  habit,
  SDE_MILESTONES,
  systemDesignTrack,
} from './building-blocks';
import type { PlanTemplate } from './types';

export const sdeInterview: PlanTemplate = {
  key: 'sde_interview',
  title: 'SDE interview prep',
  tagline: 'DSA, System Design and CS fundamentals for product-company interviews.',
  goalType: 'interview',
  defaultGoalTitle: 'Become interview-ready for SDE-1 roles',
  defaultRole: 'SDE-1',
  durationMonths: 6,
  tracks: [dsaTrack(), systemDesignTrack(), csFundamentalsTrack()],
  sessionPriority: ['dsa', 'system_design', 'cs_fundamentals'],
  milestones: SDE_MILESTONES,
  habits: [
    habit('DSA practice', 5, 'dsa'),
    habit('System Design learning', 3, 'system_design'),
    habit('Reading', 3),
    ...CORE_HABITS(),
  ],
  defaults: { weekdayMinutes: 120, weekendMinutes: 120, morningRevisionMinutes: 30 },
};
