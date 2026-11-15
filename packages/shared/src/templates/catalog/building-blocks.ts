import type { TrackKind } from '../../constants';
import type { HabitBundle, TrackBundle } from '../../schemas/bundle';
import type { MilestoneTemplate } from './types';

/** Reusable pieces of the built-in templates: tracks with topics, milestones and habits. */

export type TopicSpec = string | [title: string, type: 'concept' | 'practice'];

export function track(
  ref: string,
  title: string,
  kind: TrackKind,
  topics: TopicSpec[],
  extra: Partial<Pick<TrackBundle, 'description' | 'color' | 'resources'>> = {},
): TrackBundle {
  return {
    ref,
    title,
    kind,
    description: extra.description ?? null,
    color: extra.color ?? null,
    resources: extra.resources ?? [],
    topics: topics.map((t) => {
      const [topicTitle, type] = typeof t === 'string' ? [t, 'concept' as const] : t;
      return { title: topicTitle, type, resources: [], notes: null };
    }),
  };
}

export function habit(
  name: string,
  targetPerWeek: number,
  linkedCategory: HabitBundle['linkedCategory'] = null,
  days: HabitBundle['days'] = [],
): HabitBundle {
  return {
    name,
    description: null,
    targetPerWeek,
    days,
    linkedCategory,
    graceMissesPerWeek: 1,
    color: null,
  };
}

export const DSA_CORE = [
  'Arrays',
  'Strings',
  'Hashing',
  'Two Pointers',
  'Sliding Window',
  'Binary Search',
  'Linked Lists',
  'Stack and Queue',
  'Recursion',
  'Trees',
  'BST',
  'Heaps',
  'Graphs',
  'Greedy',
  'Dynamic Programming',
];

export const dsaTrack = (topics = DSA_CORE) =>
  track('dsa', 'DSA', 'dsa', topics, {
    color: 'indigo',
    description: 'Topic-wise problem solving. Independent solves are what count.',
    resources: [
      {
        title: 'Striver’s A2Z DSA (takeUforward)',
        url: 'https://takeuforward.org/',
        type: 'sheet',
      },
      { title: 'NeetCode practice', url: 'https://neetcode.io/', type: 'sheet' },
    ],
  });

export const systemDesignTrack = () =>
  track(
    'system_design',
    'System Design',
    'system_design',
    [
      'Client-server architecture',
      'HTTP and REST',
      'Latency and throughput',
      'Scalability',
      'Load balancing',
      'Caching',
      'Redis',
      'SQL and NoSQL',
      'Database indexing',
      'Replication and partitioning',
      'Message queues',
      'Pub/Sub',
      'CAP theorem',
      'Consistency',
      'Rate limiting',
      'Microservices',
      ['Design: URL shortener', 'practice'],
      ['Design: Chat application', 'practice'],
      ['Design: Notification system', 'practice'],
      ['Design: Food delivery platform', 'practice'],
      ['Design: E-commerce backend', 'practice'],
      ['Design: File storage service', 'practice'],
    ],
    {
      color: 'sky',
      description: 'From fundamentals to practical design interviews.',
    },
  );

export const csFundamentalsTrack = () =>
  track(
    'cs_fundamentals',
    'CS Fundamentals',
    'cs_fundamentals',
    [
      'OS: Processes and threads',
      'OS: CPU scheduling',
      'OS: Synchronization and deadlocks',
      'OS: Memory management and paging',
      'DBMS: Normalization',
      'DBMS: Transactions and ACID',
      'DBMS: Indexing and query basics',
      'DBMS: SQL joins and aggregation',
      'CN: OSI and TCP/IP models',
      'CN: TCP vs UDP',
      'CN: HTTP, HTTPS and TLS',
      'CN: DNS and CDNs',
      'OOP principles',
      'SOLID and design patterns',
      'Low-level design basics',
    ],
    { color: 'teal', description: 'Interview-focused OS, DBMS, networks and OOP.' },
  );

export const SDE_MILESTONES: MilestoneTemplate[] = [
  { title: 'Arrays → Binary Search revised; 40 Easy problems solved independently', at: 0.17 },
  { title: 'Linked lists, stacks, recursion done; System Design fundamentals covered', at: 0.33 },
  { title: 'Trees, BST and heaps; 3 system design case studies', at: 0.5 },
  { title: 'Graphs and greedy; CS fundamentals revision pass', at: 0.67 },
  { title: 'Dynamic programming; weekly mock interviews', at: 0.83 },
  { title: 'Interview-ready: applications and referrals active', at: 1 },
];

export const GENERIC_MILESTONES: MilestoneTemplate[] = [
  { title: 'Foundations complete', at: 0.25 },
  { title: 'Halfway review — adjust the plan', at: 0.5 },
  { title: 'Practice, projects and mocks', at: 0.75 },
  { title: 'Goal reached', at: 1 },
];

export const CORE_HABITS = (): HabitBundle[] => [
  habit('Sleep on time', 7),
  habit('Journaling', 6, 'journaling'),
  habit('Weekly planning', 1),
  habit('Gym', 3, 'gym'),
];
