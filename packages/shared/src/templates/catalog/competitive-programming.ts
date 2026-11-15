import { CORE_HABITS, GENERIC_MILESTONES, habit, track } from './building-blocks';
import type { PlanTemplate } from './types';

export const competitiveProgramming: PlanTemplate = {
  key: 'competitive_programming',
  title: 'Competitive programming',
  tagline: 'Algorithms, contests and upsolving.',
  goalType: 'competitive_programming',
  defaultGoalTitle: 'Reach the next rating tier',
  defaultRole: null,
  durationMonths: 6,
  tracks: [
    track(
      'cp_algorithms',
      'Algorithms',
      'dsa',
      [
        'Implementation and math',
        'Greedy',
        'Binary search',
        'Prefix sums and two pointers',
        'Number theory',
        'Combinatorics',
        'Graphs: BFS, DFS, shortest paths',
        'DSU and MST',
        'Trees: LCA, Euler tour',
        'Dynamic programming',
        'Bitmasks',
        'Segment tree and Fenwick tree',
        'Strings: hashing, KMP, Z',
      ],
      { color: 'indigo' },
    ),
    track(
      'cp_contests',
      'Contests',
      'custom',
      [
        ['Weekly rated contests', 'practice'],
        ['Upsolving', 'practice'],
        ['Virtual contests', 'practice'],
      ],
      { color: 'orange' },
    ),
  ],
  sessionPriority: ['cp_algorithms', 'cp_contests'],
  milestones: GENERIC_MILESTONES,
  habits: [habit('Practice', 5, 'dsa'), habit('Contest or virtual', 1), ...CORE_HABITS()],
  defaults: { weekdayMinutes: 120, weekendMinutes: 180, morningRevisionMinutes: 0 },
};
