/** Learning tracks, topics, DSA problems and spaced revision. */

export const DEFAULT_REVISION_INTERVALS = [1, 3, 7, 14, 30] as const;

export const PROBLEM_OUTCOMES = ['independent', 'hints', 'editorial', 'unsolved'] as const;
export type ProblemOutcome = (typeof PROBLEM_OUTCOMES)[number];
export const PROBLEM_OUTCOME_META: Record<ProblemOutcome, { label: string; description: string }> =
  {
    independent: { label: 'Solved independently', description: 'No hints, no editorial, no AI.' },
    hints: { label: 'Solved with hints', description: 'Needed a nudge, then finished alone.' },
    editorial: {
      label: 'Needed the editorial',
      description: 'Read or copied the solution. Never counts as independent.',
    },
    unsolved: { label: 'Not solved yet', description: 'Attempted, will revisit.' },
  };

export const DIFFICULTIES = ['easy', 'medium', 'hard'] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

export const PLATFORMS = [
  'leetcode',
  'codeforces',
  'gfg',
  'codingninjas',
  'hackerrank',
  'codechef',
  'atcoder',
  'interviewbit',
  'other',
] as const;
export type Platform = (typeof PLATFORMS)[number];

export const TRACK_KINDS = ['dsa', 'system_design', 'cs_fundamentals', 'custom'] as const;
export type TrackKind = (typeof TRACK_KINDS)[number];

export const TOPIC_STATUSES = ['not_started', 'in_progress', 'completed'] as const;
export type TopicStatus = (typeof TOPIC_STATUSES)[number];

export const SKILL_LEVELS = ['beginner', 'intermediate', 'advanced'] as const;
export type SkillLevel = (typeof SKILL_LEVELS)[number];
