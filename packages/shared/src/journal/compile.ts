import type { Mood, ProblemOutcome, TopicConfidence } from '../constants';
import type { JournalNotes, JournalProblem } from '../schemas/journal';
import type { LocalDate } from '../time';
import { notesHaveContent } from './normalize';

/**
 * The weekly revision sheet, compiled from each night's notes without any AI: topics merged by
 * name, every problem with its outcome, mistakes, open questions and what to revise. This is what
 * the weekend revision works from; the optional AI summary is written on top of it.
 */

export interface WeekNightInput {
  date: LocalDate;
  mood: Mood | null;
  energy: number | null;
  notes: JournalNotes | null;
  /** Typed log and transcript, used for nights without notes. */
  log: string | null;
  completed: boolean;
}

export interface CompiledTopic {
  name: string;
  keyPoints: string[];
  dates: LocalDate[];
  /** Confidence from the most recent night that rated it. */
  confidence: TopicConfidence | null;
}

export interface CompiledWeek {
  /** Nights with something written or said. */
  nights: number;
  topics: CompiledTopic[];
  problems: (JournalProblem & { date: LocalDate })[];
  outcomes: Record<ProblemOutcome | 'unknown', number>;
  mistakes: { text: string; date: LocalDate }[];
  questions: { text: string; date: LocalDate }[];
  reviseNext: string[];
  /** Nights that have a log but no notes (notes off, pending or failed). */
  unsummarised: { date: LocalDate; log: string }[];
  days: { date: LocalDate; mood: Mood | null; energy: number | null; hasNotes: boolean }[];
}

const key = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();

/** Words too generic to identify a topic on their own. */
const GENERIC = new Set([
  'algorithm',
  'algorithms',
  'problem',
  'problems',
  'pattern',
  'basics',
  'intro',
  'the',
  'and',
  'with',
]);

function significantWords(s: string): string[] {
  return key(s)
    .split(' ')
    .filter((w) => w.length >= 3 && !GENERIC.has(w));
}

export function compileWeek(nights: WeekNightInput[]): CompiledWeek {
  const sorted = [...nights].sort((a, b) => a.date.localeCompare(b.date));
  const topics = new Map<string, CompiledTopic>();
  const out: CompiledWeek = {
    nights: 0,
    topics: [],
    problems: [],
    outcomes: { independent: 0, hints: 0, editorial: 0, unsolved: 0, unknown: 0 },
    mistakes: [],
    questions: [],
    reviseNext: [],
    unsummarised: [],
    days: [],
  };
  const revise = new Map<string, string>();
  const seenMistakes = new Set<string>();
  const seenQuestions = new Set<string>();

  for (const n of sorted) {
    const hasNotes = notesHaveContent(n.notes);
    const log = n.log?.trim() ?? '';
    if (hasNotes || log) out.nights++;
    out.days.push({ date: n.date, mood: n.mood, energy: n.energy, hasNotes });
    if (!hasNotes) {
      if (log) out.unsummarised.push({ date: n.date, log });
      continue;
    }
    const notes = n.notes!;
    for (const t of notes.topics) {
      const k = key(t.name);
      if (!k) continue;
      const existing = topics.get(k);
      if (!existing) {
        topics.set(k, {
          name: t.name,
          keyPoints: [...t.keyPoints],
          dates: [n.date],
          confidence: t.confidence,
        });
        continue;
      }
      if (!existing.dates.includes(n.date)) existing.dates.push(n.date);
      const points = new Set(existing.keyPoints.map(key));
      for (const p of t.keyPoints) {
        if (!points.has(key(p))) {
          existing.keyPoints.push(p);
          points.add(key(p));
        }
      }
      if (t.confidence) existing.confidence = t.confidence;
    }
    for (const p of notes.problems) {
      out.problems.push({ ...p, date: n.date });
      out.outcomes[p.outcome ?? 'unknown']++;
    }
    for (const m of notes.mistakes) {
      if (seenMistakes.has(key(m))) continue;
      seenMistakes.add(key(m));
      out.mistakes.push({ text: m, date: n.date });
    }
    for (const q of notes.questions) {
      if (seenQuestions.has(key(q))) continue;
      seenQuestions.add(key(q));
      out.questions.push({ text: q, date: n.date });
    }
    for (const r of notes.reviseNext) if (!revise.has(key(r))) revise.set(key(r), r);
  }

  out.topics = [...topics.values()];
  // Shaky topics and problems that needed help are what the weekend revision is for, unless an
  // item already covers them ("Network Delay Time without notes" covers "Network Delay Time").
  const covered = (name: string) => {
    const words = significantWords(name);
    return (
      words.length > 0 &&
      [...revise.keys()].some((k) => {
        const have = new Set(k.split(' '));
        return words.every((w) => have.has(w));
      })
    );
  };
  for (const t of out.topics) {
    if (t.confidence === 'shaky' && !covered(t.name)) revise.set(key(t.name), t.name);
  }
  for (const p of out.problems) {
    if ((p.outcome === 'editorial' || p.outcome === 'unsolved') && !covered(p.name)) {
      revise.set(key(p.name), p.name);
    }
  }
  out.reviseNext = [...revise.values()];
  return out;
}
