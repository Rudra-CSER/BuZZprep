import { CORE_HABITS, GENERIC_MILESTONES, habit, track } from './building-blocks';
import type { PlanTemplate } from './types';

export const careerTransition: PlanTemplate = {
  key: 'career_transition',
  title: 'Career transition',
  tagline: 'Skills, portfolio and job search for a new role.',
  goalType: 'career_transition',
  defaultGoalTitle: 'Land a role in a new field',
  defaultRole: null,
  durationMonths: 9,
  tracks: [
    track('core_skills', 'Core skills', 'custom', ['Foundations', 'Intermediate', 'Advanced'], {
      color: 'indigo',
    }),
    track(
      'portfolio',
      'Portfolio projects',
      'custom',
      [
        ['Project 1', 'practice'],
        ['Project 2', 'practice'],
        ['Capstone project', 'practice'],
      ],
      { color: 'amber' },
    ),
    track(
      'job_search',
      'Job search',
      'custom',
      ['Resume and LinkedIn', 'Networking and referrals', ['Mock interviews', 'practice']],
      { color: 'rose' },
    ),
  ],
  sessionPriority: ['core_skills', 'portfolio', 'job_search'],
  milestones: GENERIC_MILESTONES,
  habits: [habit('Learning', 5, 'custom'), habit('Networking', 2), ...CORE_HABITS()],
  defaults: { weekdayMinutes: 90, weekendMinutes: 180, morningRevisionMinutes: 0 },
};
