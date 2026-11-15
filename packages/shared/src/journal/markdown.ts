import { MOOD_LABEL, PROBLEM_OUTCOME_META, type JournalType, type Mood } from '../constants';
import type { JournalNotes, WeeklySummary } from '../schemas/journal';
import { addDays, type LocalDate } from '../time';
import type { CompiledWeek } from './compile';
import { notesHaveContent } from './normalize';

/** Plain Markdown exports: readable anywhere, easy to keep in a notes app or a git repo. */

export interface MarkdownEntry {
  type: JournalType;
  date: LocalDate;
  title: string | null;
  mood: Mood | null;
  energy: number | null;
  body: string | null;
  answers: { question: string; answer: string }[];
  notes: JournalNotes | null;
  transcript: string | null;
}

const TYPE_LABEL: Record<JournalType, string> = {
  morning: 'Morning',
  evening: 'Night journal',
  weekly: 'Weekly reflection',
  freeform: 'Note',
};

const bullets = (items: string[]) => items.map((i) => `- ${i}`).join('\n');

export function notesToMarkdown(notes: JournalNotes, headingLevel = 3): string {
  const h = '#'.repeat(headingLevel);
  const parts: string[] = [];
  if (notes.summary) parts.push(notes.summary);
  if (notes.topics.length) {
    parts.push(
      `${h} Topics\n\n` +
        notes.topics
          .map((t) => {
            const head = `- **${t.name}**${t.confidence ? ` _(${t.confidence})_` : ''}`;
            return [head, ...t.keyPoints.map((p) => `  - ${p}`)].join('\n');
          })
          .join('\n'),
    );
  }
  if (notes.problems.length) {
    parts.push(
      `${h} Problems\n\n` +
        notes.problems
          .map((p) => {
            const outcome = p.outcome ? ` — ${PROBLEM_OUTCOME_META[p.outcome].label}` : '';
            return `- ${p.name}${outcome}${p.note ? `: ${p.note}` : ''}`;
          })
          .join('\n'),
    );
  }
  if (notes.mistakes.length) parts.push(`${h} Mistakes to avoid\n\n${bullets(notes.mistakes)}`);
  if (notes.questions.length) parts.push(`${h} Open questions\n\n${bullets(notes.questions)}`);
  if (notes.reviseNext.length) parts.push(`${h} Revise next\n\n${bullets(notes.reviseNext)}`);
  return parts.join('\n\n');
}

export function entryToMarkdown(e: MarkdownEntry): string {
  const title = e.title?.trim() || TYPE_LABEL[e.type];
  const meta = [
    e.mood ? `Mood: ${MOOD_LABEL[e.mood]}` : null,
    e.energy ? `Energy: ${e.energy}/5` : null,
  ].filter(Boolean);
  const parts = [`## ${e.date} — ${title}`];
  if (meta.length) parts.push(meta.join(' · '));
  if (notesHaveContent(e.notes)) parts.push(notesToMarkdown(e.notes!));
  const answered = e.answers.filter((a) => a.answer.trim());
  if (answered.length) {
    parts.push(answered.map((a) => `**${a.question}**\n${a.answer.trim()}`).join('\n\n'));
  }
  if (e.body?.trim()) parts.push(`### Log\n\n${e.body.trim()}`);
  if (e.transcript?.trim()) parts.push(`### What I said\n\n${e.transcript.trim()}`);
  return parts.join('\n\n');
}

export function journalToMarkdown(entries: MarkdownEntry[], heading = 'Journal'): string {
  const sorted = [...entries].sort(
    (a, b) => a.date.localeCompare(b.date) || a.type.localeCompare(b.type),
  );
  return [`# ${heading}`, ...sorted.map(entryToMarkdown)].join('\n\n') + '\n';
}

export function weekToMarkdown(
  weekStart: LocalDate,
  week: CompiledWeek,
  summary: WeeklySummary | null,
): string {
  const parts = [`# Week of ${weekStart} – ${addDays(weekStart, 6)}`];
  if (summary) {
    if (summary.headline) parts.push(summary.headline);
    if (summary.wins.length) parts.push(`## Wins\n\n${bullets(summary.wins)}`);
    if (summary.weakSpots.length) parts.push(`## Weak spots\n\n${bullets(summary.weakSpots)}`);
    if (summary.revisionPlan.length) {
      parts.push(
        `## Revision plan\n\n` +
          summary.revisionPlan
            .map((p) => `- **${p.topic}**: ${p.task}${p.why ? ` _(${p.why})_` : ''}`)
            .join('\n'),
      );
    }
    if (summary.nextWeek.length) parts.push(`## Next week\n\n${bullets(summary.nextWeek)}`);
  }
  if (week.topics.length) {
    parts.push(
      `## Topics\n\n` +
        week.topics
          .map((t) => [`- **${t.name}**`, ...t.keyPoints.map((p) => `  - ${p}`)].join('\n'))
          .join('\n'),
    );
  }
  if (week.problems.length) {
    parts.push(
      `## Problems\n\n` +
        week.problems
          .map(
            (p) =>
              `- ${p.date} ${p.name}${p.outcome ? ` — ${PROBLEM_OUTCOME_META[p.outcome].label}` : ''}`,
          )
          .join('\n'),
    );
  }
  if (week.mistakes.length) {
    parts.push(`## Mistakes to avoid\n\n${bullets(week.mistakes.map((m) => m.text))}`);
  }
  if (week.questions.length) {
    parts.push(`## Open questions\n\n${bullets(week.questions.map((q) => q.text))}`);
  }
  if (week.reviseNext.length) parts.push(`## Revise\n\n${bullets(week.reviseNext)}`);
  return parts.join('\n\n') + '\n';
}
