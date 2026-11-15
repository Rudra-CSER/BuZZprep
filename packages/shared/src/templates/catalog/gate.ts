import { CORE_HABITS, GENERIC_MILESTONES, habit, track } from './building-blocks';
import type { PlanTemplate } from './types';

export const gate: PlanTemplate = {
  key: 'gate',
  title: 'GATE CSE',
  tagline: 'Subject-wise preparation with PYQs and full-length mocks.',
  goalType: 'exam',
  defaultGoalTitle: 'Qualify GATE CSE with a strong rank',
  defaultRole: null,
  durationMonths: 8,
  tracks: [
    track(
      'gate_subjects',
      'GATE subjects',
      'custom',
      [
        'Engineering Mathematics',
        'Discrete Mathematics',
        'Digital Logic',
        'Computer Organization and Architecture',
        'Programming and Data Structures',
        'Algorithms',
        'Theory of Computation',
        'Compiler Design',
        'Operating Systems',
        'Databases',
        'Computer Networks',
        'General Aptitude',
      ],
      { color: 'indigo' },
    ),
    track(
      'gate_practice',
      'PYQs & mocks',
      'custom',
      [
        ['Subject-wise PYQs', 'practice'],
        ['Topic tests', 'practice'],
        ['Full-length mock 1', 'practice'],
        ['Full-length mock 2', 'practice'],
        ['Full-length mock 3', 'practice'],
        ['Full-length mock 4', 'practice'],
      ],
      { color: 'rose' },
    ),
  ],
  sessionPriority: ['gate_subjects', 'gate_practice'],
  milestones: GENERIC_MILESTONES,
  habits: [habit('Study session', 6, 'custom'), ...CORE_HABITS()],
  defaults: { weekdayMinutes: 180, weekendMinutes: 300, morningRevisionMinutes: 30 },
};
