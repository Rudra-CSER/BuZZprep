import { addDays, isLocalDate, PROBLEM_OUTCOME_META, type ProblemOutcome } from '@buzzprep/shared';
import { ChevronLeft, ChevronRight, Download } from 'lucide-react';
import { DateTime } from 'luxon';
import { useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { toast } from 'sonner';
import { errorMessage } from '@/api/client';
import { Page } from '@/components/Page';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { exportWeek, requestWeeklySummary, useJournalWeek } from './api';
import { ConfidenceTag } from './components/NotesView';
import { weekRangeLabel } from './format';
import type { WeekResponse } from './types';

/** Weekend revision: everything the week's notes say, compiled, plus an optional AI review. */
export function WeekPage() {
  const params = useParams();
  const date = params.date && isLocalDate(params.date) ? params.date : undefined;
  const navigate = useNavigate();
  const { data, isPending } = useJournalWeek(date);

  if (!date) {
    return (
      <Page title="Week" back={{ to: '/journal', label: 'Journal' }}>
        <EmptyState title="That date doesn’t look right" />
      </Page>
    );
  }

  const shift = (days: number) =>
    data && navigate(`/journal/week/${addDays(data.weekStart, days)}`);

  return (
    <Page
      title={data ? weekRangeLabel(data.weekStart, data.weekEnd) : 'Week'}
      subtitle="Week review"
      back={{ to: '/journal', label: 'Journal' }}
      actions={
        data ? (
          <>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Previous week"
              onClick={() => shift(-7)}
            >
              <ChevronLeft />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Next week"
              disabled={addDays(data.weekStart, 7) > data.today}
              onClick={() => shift(7)}
            >
              <ChevronRight />
            </Button>
          </>
        ) : undefined
      }
    >
      {isPending || !data ? (
        <Skeleton className="h-72 w-full rounded-[14px]" />
      ) : (
        <WeekContent data={data} />
      )}
    </Page>
  );
}

function Section({
  title,
  children,
  aside,
}: {
  title: string;
  children: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <section className="grid gap-3">
      <div className="flex items-baseline justify-between gap-3 px-1">
        <h2 className="text-[17px] font-semibold tracking-[-0.01em]">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

const card = 'rounded-[14px] border bg-card px-4 py-3';

/** Problems that need work come first. */
const OUTCOME_ORDER: (ProblemOutcome | 'unknown')[] = [
  'unsolved',
  'editorial',
  'hints',
  'independent',
  'unknown',
];

function WeekContent({ data }: { data: WeekResponse }) {
  const { week, sessions } = data;
  const [asking, setAsking] = useState(false);
  const pastDays = data.days.filter((d) => d.date <= data.today).length;
  const problemCount = week.problems.length;

  const summarise = async () => {
    setAsking(true);
    try {
      await requestWeeklySummary(data.weekStart);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setAsking(false);
    }
  };

  const facts = [
    `${week.nights} of ${pastDays} night${pastDays === 1 ? '' : 's'} journaled`,
    sessions.planned ? `${sessions.done} of ${sessions.planned} study sessions done` : null,
    problemCount ? `${problemCount} problem${problemCount === 1 ? '' : 's'} logged` : null,
  ].filter(Boolean) as string[];
  const factLine =
    facts.length > 1 ? `${facts.slice(0, -1).join(', ')} and ${facts.at(-1)}.` : `${facts[0]}.`;

  const byOutcome = new Map<ProblemOutcome | 'unknown', typeof week.problems>();
  for (const p of week.problems) {
    const k = p.outcome ?? 'unknown';
    byOutcome.set(k, [...(byOutcome.get(k) ?? []), p]);
  }

  if (week.nights === 0) {
    return (
      <div className="grid gap-6">
        <p className="text-[15px] text-muted-foreground">{factLine}</p>
        <EmptyState title="No notes this week yet">
          Nights you journal show up here as one revision sheet: topics, problems, mistakes and what
          to revise.
        </EmptyState>
      </div>
    );
  }

  return (
    <div className="grid gap-8 pb-8">
      <p className="-mt-2 text-[15px] text-muted-foreground">{factLine}</p>

      <SummaryCard data={data} asking={asking} onSummarise={() => void summarise()} />

      {week.reviseNext.length > 0 ? (
        <Section title="Revise this weekend">
          <ul className={cn(card, 'grid gap-2 py-3.5')}>
            {week.reviseNext.map((r) => (
              <li key={r} className="flex gap-3 text-[15px]">
                <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
                {r}
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {week.topics.length > 0 ? (
        <Section title="Topics">
          <div className="grid gap-2">
            {week.topics.map((t) => (
              <div key={t.name} className={cn(card, 'grid gap-1.5')}>
                <p className="flex flex-wrap items-center gap-2 text-[15px] font-medium">
                  {t.name}
                  <ConfidenceTag confidence={t.confidence} />
                  <span className="ml-auto text-[13px] font-normal text-muted-foreground">
                    {t.dates.map((d) => DateTime.fromISO(d).toFormat('ccc')).join(', ')}
                  </span>
                </p>
                {t.keyPoints.length ? (
                  <ul className="grid list-disc gap-1 pl-4 text-[14.5px] leading-relaxed marker:text-muted-foreground">
                    {t.keyPoints.map((p) => (
                      <li key={p}>{p}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ))}
          </div>
        </Section>
      ) : null}

      {problemCount > 0 ? (
        <Section title="Problems">
          <div className="grid gap-2">
            {OUTCOME_ORDER.filter((k) => byOutcome.has(k)).map((k) => (
              <div key={k} className={cn(card, 'grid gap-1.5')}>
                <p className="text-[13px] text-muted-foreground">
                  {k === 'unknown' ? 'Outcome not noted' : PROBLEM_OUTCOME_META[k].label}
                </p>
                <ul className="grid gap-1 text-[15px]">
                  {byOutcome.get(k)!.map((p) => (
                    <li key={`${p.date}-${p.name}`}>
                      {p.name}
                      {p.note ? <span className="text-muted-foreground"> — {p.note}</span> : null}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Section>
      ) : null}

      {week.mistakes.length > 0 ? (
        <Section title="Mistakes to avoid">
          <ul
            className={cn(
              card,
              'grid list-disc gap-1.5 pl-8 text-[15px] marker:text-muted-foreground',
            )}
          >
            {week.mistakes.map((m) => (
              <li key={m.text}>{m.text}</li>
            ))}
          </ul>
        </Section>
      ) : null}

      {week.questions.length > 0 ? (
        <Section title="Open questions">
          <ul
            className={cn(
              card,
              'grid list-disc gap-1.5 pl-8 text-[15px] marker:text-muted-foreground',
            )}
          >
            {week.questions.map((q) => (
              <li key={q.text}>{q.text}</li>
            ))}
          </ul>
        </Section>
      ) : null}

      {week.unsummarised.length > 0 ? (
        <Section title="Nights without notes">
          <div className="grid gap-2">
            {week.unsummarised.map((u) => (
              <Link
                key={u.date}
                to={`/journal/${u.date}`}
                className={cn(card, 'grid gap-1 hover:bg-muted/40')}
              >
                <p className="text-[13px] text-muted-foreground">
                  {DateTime.fromISO(u.date).toFormat('cccc d LLL')}
                </p>
                <p className="line-clamp-3 text-[14.5px]">{u.log}</p>
              </Link>
            ))}
          </div>
        </Section>
      ) : null}

      <div>
        <Button
          variant="secondary"
          onClick={() =>
            void exportWeek(data.weekStart).catch((err) => toast.error(errorMessage(err)))
          }
        >
          <Download /> Export this week as Markdown
        </Button>
      </div>
    </div>
  );
}

function SummaryCard({
  data,
  asking,
  onSummarise,
}: {
  data: WeekResponse;
  asking: boolean;
  onSummarise: () => void;
}) {
  const { summary, summaryStatus, summaryError, ai } = data;
  const busy = summaryStatus === 'queued' || summaryStatus === 'running';

  if (summary && !busy) {
    return (
      <section className="grid gap-5 rounded-[18px] border bg-card px-5 py-5">
        {summary.headline ? (
          <p className="font-serif text-[20px] leading-snug tracking-[-0.01em]">
            {summary.headline}
          </p>
        ) : null}
        {summary.wins.length ? <SummaryList title="Wins" items={summary.wins} /> : null}
        {summary.weakSpots.length ? (
          <SummaryList title="Weak spots" items={summary.weakSpots} />
        ) : null}
        {summary.revisionPlan.length ? (
          <div className="grid gap-2">
            <h3 className="text-[15px] font-semibold">Revision plan</h3>
            <ol className="grid gap-2.5">
              {summary.revisionPlan.map((p, i) => (
                <li key={`${p.topic}-${i}`} className="grid grid-cols-[1.5rem_1fr] text-[15px]">
                  <span className="tabular-nums text-muted-foreground">{i + 1}.</span>
                  <span>
                    <span className="font-medium">{p.topic}:</span> {p.task}
                    {p.why ? (
                      <span className="block text-[14px] text-muted-foreground">{p.why}</span>
                    ) : null}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        ) : null}
        {summary.nextWeek.length ? (
          <SummaryList title="Next week" items={summary.nextWeek} />
        ) : null}
        <div className="flex items-center gap-2 border-t pt-4">
          <span className="mr-auto text-[13px] text-muted-foreground">
            {data.summaryGeneratedAt
              ? `Written ${DateTime.fromISO(data.summaryGeneratedAt).toRelative()}`
              : 'Written from your notes'}
          </span>
          {ai.summary ? (
            <Button size="sm" variant="ghost" disabled={asking} onClick={onSummarise}>
              Write again
            </Button>
          ) : null}
        </div>
      </section>
    );
  }

  return (
    <section className="grid gap-3 rounded-[18px] border border-dashed px-5 py-5">
      {busy ? (
        <p className="flex items-center gap-3 text-[15px] text-muted-foreground" role="status">
          <span aria-hidden className="size-2 animate-pulse rounded-full bg-primary" />
          Writing your week review…
        </p>
      ) : (
        <>
          <p className="text-[15px]">
            {ai.summary
              ? 'Get a short written review of this week and a revision plan for the weekend.'
              : 'Your notes are compiled below. A written review needs AI, which is off or not set up on this server.'}
          </p>
          {summaryStatus === 'failed' && summaryError ? (
            <p className="text-[14px] text-destructive">{summaryError}</p>
          ) : null}
          {ai.summary ? (
            <Button className="w-fit" disabled={asking} onClick={onSummarise}>
              {summaryStatus === 'failed' ? 'Try again' : 'Write the week review'}
            </Button>
          ) : null}
        </>
      )}
    </section>
  );
}

function SummaryList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="grid gap-2">
      <h3 className="text-[15px] font-semibold">{title}</h3>
      <ul className="grid list-disc gap-1.5 pl-4 text-[15px] leading-relaxed marker:text-muted-foreground">
        {items.map((t) => (
          <li key={t}>{t}</li>
        ))}
      </ul>
    </div>
  );
}
