import { Check, ChevronRight, Mic, MoonStar } from 'lucide-react';
import type { CSSProperties } from 'react';
import { Logo } from '@/components/Logo';
import { cn } from '@/lib/utils';
import {
  BEDTIME_LAST,
  type Clock,
  PLAN_DAY,
  PLAN_DAYS,
  PLAN_RING_RADIUS,
  span,
} from '../sample-day';
import { DayLabels } from './DayStrip';

/*
 * Small pictures of the app for the preview page's sections, in the app's own tokens with sample
 * data. Each is a figure with a label; nothing inside is interactive. `data-anim` marks where the
 * page's motion attaches (../motion); without motion each picture shows its final state.
 */

const cat = (name: string) => ({ '--cat': `var(--cat-${name})` }) as CSSProperties;

const TUESDAY: { c: string; label?: string; from: Clock; to: Clock; role?: 'journal' | 'bed' }[] = [
  { c: 'sleep', label: 'Sleep', from: [4, 0], to: [8, 45] },
  { c: 'cs_fundamentals', from: [9, 0], to: [9, 45] },
  { c: 'job', label: 'Work', from: [11, 0], to: [18, 0] },
  { c: 'dsa', label: 'DSA', from: [19, 0], to: [20, 30] },
  { c: 'system_design', from: [21, 0], to: [22, 0] },
  { c: 'journaling', from: [1, 5], to: BEDTIME_LAST, role: 'journal' },
  { c: 'sleep', from: BEDTIME_LAST, to: [4, 0], role: 'bed' },
];

/** A day laid out around work and sleep, bedtime creeping earlier, and a missed session. */
export function RoutineVignette() {
  return (
    <figure
      role="img"
      aria-label="A day planned around work and sleep, with bedtime moving earlier each week and a missed session waiting for a decision"
      data-anim="routine"
      className="m-0 grid gap-3"
    >
      <div className="rounded-[20px] border bg-card p-5">
        <p className="text-[14px] text-muted-foreground">Tuesday</p>
        <div className="relative mt-2 h-12 overflow-hidden rounded-[12px] bg-muted">
          {TUESDAY.map(({ c, label, from, to, role }) => (
            <span
              key={`${c}${from.join(':')}`}
              data-anim="routine-block"
              data-role={role}
              style={{ ...cat(c), ...span(from, to) }}
              className="absolute inset-y-0 flex min-w-[3px] items-center justify-center cat-tint text-[12px] font-medium cat-text"
            >
              {label}
            </span>
          ))}
        </div>
        <DayLabels className="mt-1.5 h-4 text-[12px] leading-4" />
        <p className="mt-4 flex items-center gap-2 text-[15px]">
          <MoonStar className="size-4 text-muted-foreground" />
          <span data-anim="routine-bedtime" className="tabular">
            Week 6: bed at 1:15 AM
          </span>
        </p>
        <p className="mt-0.5 pl-6 text-[14px] text-muted-foreground">
          It started at 2:30 AM and moves a little earlier each week.
        </p>
      </div>
      <div
        data-anim="routine-decision"
        className="ml-6 flex items-center gap-3 rounded-[16px] border border-warning/40 bg-warning/10 p-3.5 sm:ml-10"
      >
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-warning/25 text-[14px] font-semibold">
          1
        </span>
        <span className="grid flex-1">
          <span className="text-[15px] font-medium">A session needs a decision</span>
          <span className="text-[13px] text-muted-foreground">
            Done, skipped, or move to a free slot?
          </span>
        </span>
        <ChevronRight className="size-4 text-muted-foreground" />
      </div>
    </figure>
  );
}

/** Each reminder lands this many minutes into the lock screen's evening (from 6:50 PM). */
const NOTICES = [
  {
    at: 375,
    title: 'Time to wind down',
    body: 'Tonight’s journal is open. Ten minutes, then sleep.',
    when: '1:05 AM',
  },
  {
    at: 120,
    title: 'System design in 10 min',
    body: 'Caching and CDNs, 9:00 to 10:00 PM.',
    when: '8:50 PM',
  },
  {
    at: 0,
    title: 'DSA practice in 10 min',
    body: 'Graphs: three problems, 7:00 to 8:30 PM.',
    when: '6:50 PM',
  },
];

/** A locked phone through one evening: reminders arrive, then quiet hours begin. */
export function ReminderVignette() {
  return (
    <figure
      role="img"
      aria-label="buZZprep reminders arriving on a locked phone through the evening, then quiet hours starting at 1:30 AM"
      data-anim="lock"
      className="relative m-0 h-[440px] overflow-hidden rounded-[24px] bg-[linear-gradient(160deg,oklch(0.3_0.05_279),oklch(0.2_0.04_285))] p-4 sm:h-[400px] sm:p-6"
    >
      <span
        data-anim="lock-night"
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(160deg,oklch(0.19_0.035_276),oklch(0.11_0.02_282))]"
      />
      <div className="relative">
        <p
          data-anim="lock-clock"
          className="pt-1 text-center text-[44px] font-light leading-none text-white/90 tabular"
        >
          1:30
        </p>
        <p
          data-anim="lock-quiet"
          className="mx-auto mt-3 flex w-fit items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[13px] text-white/80"
        >
          <MoonStar className="size-3.5" />
          Quiet hours until 8:30 AM
        </p>
        <div className="mt-4">
          {NOTICES.map(({ at, ...n }) => (
            <div key={n.title} data-anim="lock-notice" data-at={at} className="overflow-hidden">
              <Notice {...n} />
            </div>
          ))}
        </div>
      </div>
    </figure>
  );
}

function Notice({ title, body, when }: { title: string; body: string; when: string }) {
  return (
    <div className="mb-2.5 flex gap-3 rounded-[18px] bg-white/90 p-3 text-[#16161d] backdrop-blur">
      <Logo decorative className="size-9 shrink-0 rounded-[9px]" />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <p className="truncate text-[14px] font-semibold">{title}</p>
          <span className="shrink-0 text-[12px] text-black/50">{when}</span>
        </div>
        <p className="text-[14px] leading-snug text-black/75">{body}</p>
      </div>
    </div>
  );
}

const WAVE = [40, 75, 55, 100, 65, 85, 45, 70, 35, 60, 90, 50];

/**
 * For the night band: the Tonight card, a spoken walk-through, and the revision notes written from
 * it. Drawn with the night palette, so it belongs inside a `night` surface.
 */
export function JournalVignette() {
  return (
    <figure
      role="img"
      aria-label="Tonight's journal card, a spoken walk-through of the day, and the revision notes written from it"
      data-anim="journal"
      className="m-0 grid gap-3"
    >
      <div className="relative overflow-hidden rounded-[20px] bg-card px-5 pb-5 pt-4 ring-1 ring-inset ring-night-line">
        <span
          data-anim="journal-glow"
          className="pointer-events-none absolute -right-10 -top-12 size-40 rounded-full bg-night-glow/15 blur-2xl"
        />
        <p className="text-[13px] text-muted-foreground">Tonight · bed at 1:15 AM</p>
        <p className="mt-1 text-[23px] leading-tight tracking-[-0.01em]">Time to wind down.</p>
        <p className="mt-1.5 text-[14.5px] leading-snug text-muted-foreground">
          Talk through what you studied, then put the phone down.
        </p>
        <span
          data-anim="journal-start"
          className="mt-4 inline-flex h-10 items-center rounded-[11px] bg-primary px-4 text-[15px] font-medium text-primary-foreground"
        >
          Start
        </span>
      </div>
      <div
        data-anim="journal-say"
        className="ml-6 flex gap-3 rounded-[18px] bg-card p-4 ring-1 ring-inset ring-night-line sm:ml-10"
      >
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-night-glow text-night">
          <Mic className="size-4" />
        </span>
        <div className="grid min-w-0 gap-2">
          <span aria-hidden className="flex h-3.5 items-end gap-[3px]">
            {WAVE.map((h, i) => (
              <span
                key={i}
                data-anim="journal-bar"
                style={{ height: `${h}%` }}
                className="w-[3px] rounded-full bg-night-glow/70"
              />
            ))}
          </span>
          <p data-anim="journal-words" className="text-[15px] leading-snug">
            “Graph traversal today. BFS on grids finally clicked, but I’m still fuzzy on when
            Dijkstra skips a node.”
          </p>
        </div>
      </div>
      <div
        data-anim="journal-notes"
        className="ml-12 rounded-[20px] bg-card p-5 ring-1 ring-inset ring-night-line sm:ml-20"
      >
        <p className="text-[13px] font-medium text-muted-foreground">Revision notes</p>
        <p className="mt-1 font-serif text-[17px] leading-snug">
          Graph traversal day. BFS on grids clicked; Dijkstra is still fuzzy.
        </p>
        <ul className="mt-3 grid gap-1.5 text-[15px]">
          <li className="flex items-center gap-2">
            BFS on grids
            <span
              data-anim="journal-chip"
              className="rounded-full bg-success/20 px-2 text-[12px] text-success"
            >
              Solid
            </span>
          </li>
          <li className="flex items-center gap-2">
            Dijkstra’s algorithm
            <span
              data-anim="journal-chip"
              className="rounded-full bg-warning/20 px-2 text-[12px] text-warning"
            >
              Shaky
            </span>
          </li>
        </ul>
        <p className="mt-3 text-[13px] font-medium text-muted-foreground">Revise next</p>
        <p className="text-[15px]">Dijkstra with a min-heap, without notes</p>
      </div>
    </figure>
  );
}

/** The plan: how far through it you are, and the milestones on the way. */
export function PlanVignette() {
  const length = 2 * Math.PI * PLAN_RING_RADIUS;
  return (
    <figure
      role="img"
      aria-label={`A plan at day ${PLAN_DAY} of ${PLAN_DAYS} with its next milestones`}
      data-anim="plan"
      className="m-0 rounded-[20px] border bg-card p-5"
    >
      <div className="flex items-center gap-4">
        <svg viewBox="0 0 72 72" className="size-[72px] -rotate-90">
          <circle
            cx="36"
            cy="36"
            r={PLAN_RING_RADIUS}
            fill="none"
            className="stroke-muted"
            strokeWidth={7}
          />
          <circle
            data-anim="plan-ring"
            cx="36"
            cy="36"
            r={PLAN_RING_RADIUS}
            fill="none"
            stroke="var(--gold)"
            strokeWidth={7}
            strokeLinecap="round"
            strokeDasharray={`${(PLAN_DAY / PLAN_DAYS) * length} ${length}`}
          />
        </svg>
        <div>
          <p className="text-[13px] text-muted-foreground">Interview-ready by 4 May</p>
          <p className="text-[24px] font-semibold leading-tight tracking-[-0.01em]">
            <span data-anim="plan-day" className="tabular">
              Day {PLAN_DAY}
            </span>{' '}
            of {PLAN_DAYS}
          </p>
        </div>
      </div>
      <ul className="mt-4 grid gap-2.5 border-t pt-4 text-[15px]">
        <Milestone done title="Arrays and binary search" when="5 Dec" />
        <Milestone title="Graphs and trees" when="3 Jan" />
        <Milestone title="System design basics" when="7 Feb" />
      </ul>
    </figure>
  );
}

function Milestone({ title, when, done }: { title: string; when: string; done?: boolean }) {
  return (
    <li className="flex items-center gap-3">
      <span
        className={cn(
          'grid size-5 shrink-0 place-items-center rounded-full border-[1.5px]',
          done ? 'border-success bg-success text-white' : 'border-input',
        )}
      >
        {done ? <Check data-anim="plan-check" className="size-3" strokeWidth={3} /> : null}
      </span>
      <span className="flex-1">{title}</span>
      <span className="text-[13px] text-muted-foreground">{when}</span>
    </li>
  );
}
