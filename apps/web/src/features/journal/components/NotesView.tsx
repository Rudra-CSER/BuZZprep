import {
  PROBLEM_OUTCOME_META,
  type JournalNotes,
  type ProblemOutcome,
  type TopicConfidence,
} from '@buzzprep/shared';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

const CONFIDENCE: Record<TopicConfidence, { label: string; className: string }> = {
  shaky: {
    label: 'Shaky',
    className: 'bg-warning/15 text-[color-mix(in_oklch,var(--warning)_70%,var(--foreground))]',
  },
  okay: { label: 'Okay', className: 'bg-muted text-muted-foreground' },
  solid: {
    label: 'Solid',
    className: 'bg-success/15 text-[color-mix(in_oklch,var(--success)_75%,var(--foreground))]',
  },
};

const OUTCOME: Record<ProblemOutcome, string> = {
  independent: 'bg-success/15 text-[color-mix(in_oklch,var(--success)_75%,var(--foreground))]',
  hints: 'bg-warning/15 text-[color-mix(in_oklch,var(--warning)_70%,var(--foreground))]',
  editorial: 'bg-destructive/12 text-destructive',
  unsolved: 'bg-muted text-muted-foreground',
};

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="grid gap-2">
      <h3 className="text-[15px] font-semibold">{title}</h3>
      {children}
    </section>
  );
}

function Bullets({ items }: { items: string[] }) {
  return (
    <ul className="grid gap-1.5 pl-4 text-[15px] leading-relaxed list-disc marker:text-muted-foreground">
      {items.map((t) => (
        <li key={t}>{t}</li>
      ))}
    </ul>
  );
}

export function Tag({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <span
      className={cn(
        'inline-flex h-5 items-center rounded-full px-2 text-[12px] font-medium',
        className,
      )}
    >
      {children}
    </span>
  );
}

export function OutcomeTag({ outcome }: { outcome: ProblemOutcome | null }) {
  if (!outcome) return null;
  return <Tag className={OUTCOME[outcome]}>{PROBLEM_OUTCOME_META[outcome].label}</Tag>;
}

export function ConfidenceTag({ confidence }: { confidence: TopicConfidence | null }) {
  if (!confidence) return null;
  return <Tag className={CONFIDENCE[confidence].className}>{CONFIDENCE[confidence].label}</Tag>;
}

/** Revision notes for one night. `compact` shows the summary and what to revise. */
export function NotesView({ notes, compact = false }: { notes: JournalNotes; compact?: boolean }) {
  return (
    <div className="grid gap-5">
      {notes.summary ? (
        <p className="font-serif text-[18px] leading-[1.5] tracking-[-0.005em]">{notes.summary}</p>
      ) : null}
      {!compact && notes.topics.length > 0 ? (
        <Section title="Topics">
          <div className="grid gap-3">
            {notes.topics.map((t) => (
              <div key={t.name} className="grid gap-1">
                <p className="flex flex-wrap items-center gap-2 text-[15px] font-medium">
                  {t.name} <ConfidenceTag confidence={t.confidence} />
                </p>
                {t.keyPoints.length > 0 ? <Bullets items={t.keyPoints} /> : null}
              </div>
            ))}
          </div>
        </Section>
      ) : null}
      {!compact && notes.problems.length > 0 ? (
        <Section title="Problems">
          <ul className="grid gap-2">
            {notes.problems.map((p) => (
              <li key={p.name} className="grid gap-0.5">
                <p className="flex flex-wrap items-center gap-2 text-[15px]">
                  {p.name} <OutcomeTag outcome={p.outcome} />
                </p>
                {p.note ? <p className="text-[14px] text-muted-foreground">{p.note}</p> : null}
              </li>
            ))}
          </ul>
        </Section>
      ) : null}
      {!compact && notes.mistakes.length > 0 ? (
        <Section title="Mistakes to avoid">
          <Bullets items={notes.mistakes} />
        </Section>
      ) : null}
      {!compact && notes.questions.length > 0 ? (
        <Section title="Open questions">
          <Bullets items={notes.questions} />
        </Section>
      ) : null}
      {notes.reviseNext.length > 0 ? (
        <Section title="Revise next">
          <Bullets items={compact ? notes.reviseNext.slice(0, 4) : notes.reviseNext} />
        </Section>
      ) : null}
    </div>
  );
}
