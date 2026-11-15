import { CORE_HABITS, GENERIC_MILESTONES, habit, track } from './building-blocks';
import type { PlanTemplate } from './types';

export const newSkill: PlanTemplate = {
  key: 'new_skill',
  title: 'Learn a new skill',
  tagline: 'A focused plan for one technical skill.',
  goalType: 'skill',
  defaultGoalTitle: 'Learn a new skill and ship a project with it',
  defaultRole: null,
  durationMonths: 3,
  tracks: [
    track(
      'skill',
      'New skill',
      'custom',
      [
        'Fundamentals',
        'Core concepts',
        ['Guided project', 'practice'],
        'Advanced topics',
        ['Build and share your own project', 'practice'],
      ],
      { color: 'emerald' },
    ),
  ],
  sessionPriority: ['skill'],
  milestones: GENERIC_MILESTONES,
  habits: [habit('Practice', 5, 'custom'), ...CORE_HABITS()],
  defaults: { weekdayMinutes: 60, weekendMinutes: 120, morningRevisionMinutes: 0 },
};
