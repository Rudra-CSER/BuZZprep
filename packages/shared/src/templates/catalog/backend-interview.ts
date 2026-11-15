import {
  CORE_HABITS,
  dsaTrack,
  GENERIC_MILESTONES,
  habit,
  systemDesignTrack,
  track,
} from './building-blocks';
import type { PlanTemplate } from './types';

export const backendInterview: PlanTemplate = {
  key: 'backend_interview',
  title: 'Backend interviews',
  tagline: 'DSA, system design, databases and backend fundamentals.',
  goalType: 'interview',
  defaultGoalTitle: 'Crack backend engineering interviews',
  defaultRole: 'Backend Engineer',
  durationMonths: 5,
  tracks: [
    dsaTrack(),
    systemDesignTrack(),
    track(
      'databases',
      'Databases',
      'custom',
      [
        'SQL deep dive',
        'Indexes and query plans',
        'Transactions and isolation levels',
        'NoSQL data modeling',
        'Replication',
        'Sharding',
      ],
      { color: 'emerald' },
    ),
    track(
      'backend_fundamentals',
      'Backend fundamentals',
      'custom',
      [
        'HTTP and REST API design',
        'Authentication: sessions, JWT, OAuth',
        'Caching strategies',
        'Queues and background jobs',
        'Observability',
        'Concurrency',
      ],
      { color: 'orange' },
    ),
  ],
  sessionPriority: ['dsa', 'system_design', 'databases', 'backend_fundamentals'],
  milestones: GENERIC_MILESTONES,
  habits: [
    habit('DSA practice', 5, 'dsa'),
    habit('System Design learning', 3, 'system_design'),
    ...CORE_HABITS(),
  ],
  defaults: { weekdayMinutes: 120, weekendMinutes: 120, morningRevisionMinutes: 0 },
};
