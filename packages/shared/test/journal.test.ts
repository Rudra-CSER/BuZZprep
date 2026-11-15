import { describe, expect, it } from 'vitest';
import {
  compileWeek,
  emptyNotes,
  entryToMarkdown,
  findNightSleep,
  nightWindow,
  normalizeNotes,
  normalizeWeeklySummary,
  notesHaveContent,
  studiedToday,
  weekToMarkdown,
  type WeekNightInput,
} from '../src/journal';
import { DEFAULT_NOTIFICATION_PREFERENCES, planNotifications } from '../src/reminders';
import { expandAgenda } from '../src/schedule';
import {
  DEFAULT_JOURNAL_PREFS,
  journalPrefsPatchSchema,
  mergeJournalPrefs,
  resolveJournalPrefs,
  type JournalNotes,
} from '../src/schemas/journal';
import { act, IST } from './fixtures';

const notes = (partial: Partial<JournalNotes>): JournalNotes => ({ ...emptyNotes(), ...partial });

describe('normalizeNotes — model output is untrusted', () => {
  it('coerces messy output into the stored shape', () => {
    const n = normalizeNotes({
      summary: '  Graphs   day.\n\nBFS clicked.  ',
      topics: [
        {
          name: 'BFS',
          keyPoints: ['Queue, visited on push', 'queue, visited on PUSH', ''],
          confidence: 'SOLID',
        },
        { name: '', keyPoints: ['dropped: no name'] },
        'not an object',
      ],
      problems: [
        { name: 'Rotting Oranges', outcome: 'Hints', note: '' },
        { name: 'Course Schedule', outcome: 'gave up' },
      ],
      mistakes: 'should be a list',
      questions: [42, 'Why is Dijkstra wrong with negative edges?'],
      reviseNext: Array.from({ length: 30 }, (_, i) => `item ${i}`),
      extra: 'ignored',
    });
    expect(n.summary).toBe('Graphs day. BFS clicked.');
    expect(n.topics).toEqual([
      { name: 'BFS', keyPoints: ['Queue, visited on push'], confidence: 'solid' },
    ]);
    expect(n.problems).toEqual([
      { name: 'Rotting Oranges', outcome: 'hints', note: null },
      { name: 'Course Schedule', outcome: null, note: null },
    ]);
    expect(n.mistakes).toEqual([]);
    expect(n.questions).toEqual(['Why is Dijkstra wrong with negative edges?']);
    expect(n.reviseNext).toHaveLength(20);
  });

  it('truncates long text and survives garbage', () => {
    expect(normalizeNotes('nope')).toEqual(emptyNotes());
    const long = normalizeNotes({ summary: 'x'.repeat(5000) });
    expect(long.summary.length).toBe(1200);
    expect(long.summary.endsWith('…')).toBe(true);
    expect(notesHaveContent(emptyNotes())).toBe(false);
    expect(notesHaveContent(notes({ mistakes: ['Off by one'] }))).toBe(true);
  });

  it('normalizes weekly summaries', () => {
    const s = normalizeWeeklySummary({
      headline: 'A graphs week.',
      revisionPlan: [{ topic: 'Dijkstra', task: 'Redo two problems' }, { topic: 'No task' }],
      wins: ['Solved 5 alone', 'Solved 5 alone'],
    });
    expect(s.revisionPlan).toEqual([{ topic: 'Dijkstra', task: 'Redo two problems', why: '' }]);
    expect(s.wins).toEqual(['Solved 5 alone']);
    expect(s.weakSpots).toEqual([]);
  });
});

describe('journal preferences', () => {
  it('fills defaults for missing or invalid stored values', () => {
    expect(resolveJournalPrefs(null)).toEqual(DEFAULT_JOURNAL_PREFS);
    expect(
      resolveJournalPrefs({ windDownMinutes: 5, keepAudio: 'yes', weeklySummary: { auto: true } }),
    ).toEqual({
      ...DEFAULT_JOURNAL_PREFS,
      windDownMinutes: 5,
      weeklySummary: { ...DEFAULT_JOURNAL_PREFS.weeklySummary, auto: true },
    });
  });

  it('patches only what was sent', () => {
    // A patch must never reset other settings to their defaults.
    expect(journalPrefsPatchSchema.parse({})).toEqual({});
    const current = { ...DEFAULT_JOURNAL_PREFS, windDownMinutes: 20, useAi: false };
    const patch = journalPrefsPatchSchema.parse({ weeklySummary: { auto: true } });
    expect(mergeJournalPrefs(current, patch)).toEqual({
      ...current,
      weeklySummary: { ...current.weeklySummary, auto: true },
    });
  });
});

describe('compileWeek', () => {
  const nights: WeekNightInput[] = [
    {
      date: '2026-11-10',
      mood: 'good',
      energy: 4,
      completed: true,
      log: null,
      notes: notes({
        topics: [
          { name: 'Dijkstra', keyPoints: ['Min-heap of (dist, node)'], confidence: 'shaky' },
        ],
        problems: [{ name: 'Network Delay Time', outcome: 'editorial', note: null }],
        mistakes: ['Pushed stale distances without skipping them'],
        reviseNext: ['Heap invariants'],
      }),
    },
    {
      date: '2026-11-09',
      mood: 'okay',
      energy: 3,
      completed: true,
      log: null,
      notes: notes({
        topics: [{ name: 'BFS', keyPoints: ['Mark visited when pushing'], confidence: 'solid' }],
        problems: [{ name: 'Rotting Oranges', outcome: 'independent', note: null }],
      }),
    },
    {
      date: '2026-11-11',
      mood: null,
      energy: null,
      completed: true,
      log: null,
      notes: notes({
        topics: [
          {
            name: 'dijkstra ',
            keyPoints: ['min-heap of (dist, node)', 'Skip if popped dist > best'],
            confidence: 'okay',
          },
        ],
        mistakes: ['pushed stale distances without skipping them!'],
      }),
    },
    {
      date: '2026-11-12',
      mood: 'low',
      energy: 2,
      completed: false,
      log: 'Typed only.',
      notes: null,
    },
    { date: '2026-11-13', mood: null, energy: null, completed: false, log: '  ', notes: null },
  ];

  it('merges topics by name and keeps what needs revision', () => {
    const w = compileWeek(nights);
    expect(w.nights).toBe(4);
    expect(w.topics.map((t) => t.name)).toEqual(['BFS', 'Dijkstra']);
    const dijkstra = w.topics[1]!;
    expect(dijkstra.keyPoints).toEqual(['Min-heap of (dist, node)', 'Skip if popped dist > best']);
    expect(dijkstra.dates).toEqual(['2026-11-10', '2026-11-11']);
    expect(dijkstra.confidence).toBe('okay');
    expect(w.mistakes).toHaveLength(1);
    expect(w.outcomes).toMatchObject({ independent: 1, editorial: 1, unknown: 0 });
    // Explicit items first, then problems that needed the solution.
    expect(w.reviseNext).toEqual(['Heap invariants', 'Network Delay Time']);
    expect(w.unsummarised).toEqual([{ date: '2026-11-12', log: 'Typed only.' }]);
    expect(w.days.map((d) => d.date)).toEqual([
      '2026-11-09',
      '2026-11-10',
      '2026-11-11',
      '2026-11-12',
      '2026-11-13',
    ]);
  });

  it('doesn’t repeat what an explicit revision item already covers', () => {
    const w = compileWeek([
      {
        date: '2026-11-12',
        mood: null,
        energy: null,
        completed: true,
        log: null,
        notes: notes({
          topics: [
            { name: 'Dijkstra’s algorithm', keyPoints: [], confidence: 'shaky' },
            { name: 'Binary trees', keyPoints: [], confidence: 'shaky' },
          ],
          problems: [{ name: 'Network Delay Time', outcome: 'editorial', note: null }],
          reviseNext: [
            'Dijkstra’s stale-entry check',
            'Network Delay Time without notes',
            'Binary search',
          ],
        }),
      },
    ]);
    expect(w.reviseNext).toEqual([
      'Dijkstra’s stale-entry check',
      'Network Delay Time without notes',
      'Binary search',
      'Binary trees',
    ]);
  });

  it('exports Markdown', () => {
    const w = compileWeek(nights);
    const md = weekToMarkdown('2026-11-09', w, null);
    expect(md).toContain('# Week of 2026-11-09 – 2026-11-15');
    expect(md).toContain('- **Dijkstra**\n  - Min-heap of (dist, node)');
    expect(md).toContain('- 2026-11-10 Network Delay Time — Needed the editorial');
    const entry = entryToMarkdown({
      type: 'evening',
      date: '2026-11-10',
      title: null,
      mood: 'good',
      energy: 4,
      body: null,
      answers: [{ question: 'First thing tomorrow?', answer: 'Redo Network Delay' }],
      notes: nights[0]!.notes,
      transcript: 'Today I did Dijkstra.',
    });
    expect(entry).toContain('## 2026-11-10 — Night journal');
    expect(entry).toContain('Mood: Good · Energy: 4/5');
    expect(entry).toContain('**First thing tomorrow?**\nRedo Network Delay');
    expect(entry).toContain('### What I said\n\nToday I did Dijkstra.');
  });
});

describe('night window and the journal reminder', () => {
  const activities = [
    act({
      id: 'sleep',
      title: 'Sleep',
      category: 'sleep',
      startTime: '01:15',
      durationMinutes: 465,
    }),
    act({
      id: 'wind',
      title: 'Wind down',
      category: 'sleep',
      startTime: '00:45',
      durationMinutes: 30,
    }),
    act({ id: 'dsa', title: 'DSA', category: 'dsa', startTime: '19:00', durationMinutes: 70 }),
  ];
  const occurrences = expandAgenda({ activities, from: '2026-11-12', to: '2026-11-14', ctx: IST });

  it('finds the night’s sleep block, not the wind-down routine', () => {
    const sleep = findNightSleep(occurrences, '2026-11-13');
    expect(sleep?.activityId).toBe('sleep');
    // Friday's logical day: bedtime is 01:15 on Saturday morning, IST.
    expect(nightWindow(sleep, 10)).toEqual({
      bedtime: '2026-11-13T19:45:00.000Z',
      opensAt: '2026-11-13T19:35:00.000Z',
    });
    expect(nightWindow(null, 10)).toEqual({ bedtime: null, opensAt: null });
    expect(studiedToday(occurrences, '2026-11-13').map((s) => s.title)).toEqual(['DSA']);
  });

  it('plans a reminder that opens tonight’s journal and skips itself once done', () => {
    const planned = planNotifications({
      reminders: [
        {
          id: 'j',
          kind: 'journal',
          anchor: 'activity_start',
          activityId: 'sleep',
          offsetMinutes: -10,
          enabled: true,
          bypassQuietHours: true,
        },
      ],
      occurrences,
      prefs: DEFAULT_NOTIFICATION_PREFERENCES,
      from: '2026-11-13T12:00:00.000Z',
      to: '2026-11-14T00:00:00.000Z',
      ctx: IST,
    });
    expect(planned).toHaveLength(1);
    expect(planned[0]).toMatchObject({
      fireAt: '2026-11-13T19:35:00.000Z',
      title: 'Tonight’s journal',
      body: '10 min to bed. Talk through what you studied, then put the phone down.',
      url: '/journal/tonight?date=2026-11-13',
      tag: 'journal:2026-11-13',
      condition: 'journal_pending',
      suppressedReason: null,
    });
  });
});
