import {
  PROBLEM_OUTCOMES,
  TOPIC_CONFIDENCE,
  type ProblemOutcome,
  type TopicConfidence,
} from '../constants';
import {
  journalNotesSchema,
  weeklySummarySchema,
  type JournalNotes,
  type WeeklySummary,
} from '../schemas/journal';

/**
 * Model output is untrusted input: these functions coerce whatever came back into the stored
 * shape (trimmed, truncated, deduplicated, enums checked case-insensitively) and then validate
 * it with the same zod schema the API uses. Anything unusable becomes empty, never an error.
 */

type Rec = Record<string, unknown>;
const isRec = (v: unknown): v is Rec => typeof v === 'object' && v !== null && !Array.isArray(v);
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);

function text(v: unknown, max: number): string {
  if (typeof v !== 'string') return '';
  const t = v.replace(/\s+/g, ' ').trim();
  return t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t;
}

function list(v: unknown, max: number, count: number): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of arr(v)) {
    const t = text(raw, max);
    const key = t.toLowerCase();
    if (!t || seen.has(key)) continue;
    seen.add(key);
    out.push(t);
    if (out.length === count) break;
  }
  return out;
}

function oneOf<T extends string>(values: readonly T[], v: unknown): T | null {
  if (typeof v !== 'string') return null;
  const k = v.trim().toLowerCase();
  return values.find((x) => x === k) ?? null;
}

export function emptyNotes(): JournalNotes {
  return { summary: '', topics: [], problems: [], mistakes: [], questions: [], reviseNext: [] };
}

export function notesHaveContent(n: JournalNotes | null | undefined): boolean {
  if (!n) return false;
  return Boolean(
    n.summary ||
    n.topics.length ||
    n.problems.length ||
    n.mistakes.length ||
    n.questions.length ||
    n.reviseNext.length,
  );
}

export function normalizeNotes(raw: unknown): JournalNotes {
  const r = isRec(raw) ? raw : {};
  const topics = arr(r.topics)
    .filter(isRec)
    .map((t) => ({
      name: text(t.name, 120),
      keyPoints: list(t.keyPoints, 400, 12),
      confidence: oneOf<TopicConfidence>(TOPIC_CONFIDENCE, t.confidence),
    }))
    .filter((t) => t.name)
    .slice(0, 20);
  const problems = arr(r.problems)
    .filter(isRec)
    .map((p) => ({
      name: text(p.name, 160),
      outcome: oneOf<ProblemOutcome>(PROBLEM_OUTCOMES, p.outcome),
      note: text(p.note, 400) || null,
    }))
    .filter((p) => p.name)
    .slice(0, 30);
  return journalNotesSchema.parse({
    summary: text(r.summary, 1200),
    topics,
    problems,
    mistakes: list(r.mistakes, 400, 20),
    questions: list(r.questions, 400, 20),
    reviseNext: list(r.reviseNext, 300, 20),
  });
}

export function normalizeWeeklySummary(raw: unknown): WeeklySummary {
  const r = isRec(raw) ? raw : {};
  return weeklySummarySchema.parse({
    headline: text(r.headline, 300),
    wins: list(r.wins, 300, 10),
    topics: arr(r.topics)
      .filter(isRec)
      .map((t) => ({ name: text(t.name, 120), summary: text(t.summary, 600) }))
      .filter((t) => t.name)
      .slice(0, 20),
    weakSpots: list(r.weakSpots, 300, 10),
    revisionPlan: arr(r.revisionPlan)
      .filter(isRec)
      .map((p) => ({ topic: text(p.topic, 120), task: text(p.task, 300), why: text(p.why, 300) }))
      .filter((p) => p.topic && p.task)
      .slice(0, 12),
    nextWeek: list(r.nextWeek, 300, 8),
  });
}
