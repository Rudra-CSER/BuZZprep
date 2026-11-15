import {
  Bell,
  BookOpen,
  CalendarDays,
  Check,
  CircleUserRound,
  House,
  Mic,
  NotebookPen,
  Play,
  X,
} from 'lucide-react';
import type { CSSProperties } from 'react';
import { Logo } from '@/components/Logo';
import { Wordmark } from '@/components/Wordmark';
import { cn } from '@/lib/utils';
import { type Clock, dayPos, HOME_NOW, span } from '../sample-day';
import { DayLabels } from './DayStrip';

/*
 * Screens of the app drawn with its own tokens and fonts, filled with sample data, for the
 * signed-out preview. They are pictures (each sits inside a PhoneFrame with a label), never live.
 */

const cat = (name: string) => ({ '--cat': `var(--cat-${name})` }) as CSSProperties;

function greeting(hour: number) {
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

/** The Home screen: greeting, plan journey, the next session and today's list. */
export function HomePreview() {
  const now = new Date();
  const date = new Intl.DateTimeFormat('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(now);

  return (
    <div className="relative flex h-full flex-col bg-chrome text-foreground">
      <div className="h-[44px]" />
      <div className="chrome flex h-[52px] items-center gap-2.5 px-4">
        <Logo decorative className="size-[26px] rounded-[8px]" />
        <Wordmark className="text-[19px] leading-none" />
        <Bell className="ml-auto mr-1.5 size-5" />
      </div>
      {/* The reminder for the next session; only the page's motion shows it. */}
      <div
        data-anim="home-banner"
        className="invisible absolute inset-x-2 top-[50px] z-10 flex gap-3 rounded-[22px] bg-white/90 p-3 text-[#16161d] shadow-[0_10px_30px_rgb(0_0_0/0.3)] backdrop-blur-xl"
      >
        <Logo decorative className="size-10 shrink-0 rounded-[10px]" />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <p className="truncate text-[15px] font-semibold">DSA practice in 10 min</p>
            <span className="shrink-0 text-[13px] text-black/50">now</span>
          </div>
          <p className="text-[15px] leading-snug text-black/75">
            Graphs: three problems, 7:00 to 8:30 PM.
          </p>
        </div>
      </div>
      <div className="flex-1 overflow-hidden rounded-t-[24px] bg-background px-4 pt-5">
        <p className="text-[14px] text-muted-foreground">{date}</p>
        <p className="text-[28px] font-semibold leading-tight tracking-[-0.01em]">
          {greeting(now.getHours())}
        </p>
        <div className="mt-1.5 flex items-baseline justify-between text-[14px]">
          <span className="font-medium">Day 12 of 182</span>
          <span className="text-muted-foreground">170 days to go</span>
        </div>
        <div className="mt-1.5 h-1 rounded-full bg-border">
          <div data-anim="home-progress" className="h-full w-[7%] rounded-full bg-primary" />
        </div>

        <div className="mt-5 rounded-[18px] border bg-card p-4 shadow-[0_1px_2px_rgb(0_0_0/0.04)]">
          <DayBar />
          <p className="mt-4 text-[13px] text-muted-foreground">Next in 10 min</p>
          <p className="text-[20px] font-semibold leading-tight">DSA practice</p>
          <p className="text-[15px] text-muted-foreground tabular">7:00 PM – 8:30 PM</p>
          <div className="mt-3.5 flex h-11 items-center justify-center gap-2 rounded-[12px] bg-primary text-[15px] font-medium text-primary-foreground">
            <Play className="size-4 fill-current" /> Start early
          </div>
        </div>

        <div className="mt-5 flex items-baseline justify-between px-1">
          <span className="text-[17px] font-semibold">Today</span>
          <span className="text-[13px] text-muted-foreground">1 of 4 done</span>
        </div>
        <ul className="mt-2 overflow-hidden rounded-[16px] border bg-card">
          <TodayRow c="cs_fundamentals" title="Morning revision" time="9:00 AM – 9:45 AM" done />
          <TodayRow c="job" title="Work" time="11:00 AM – 6:00 PM" />
          <TodayRow c="dsa" title="DSA practice" time="7:00 PM – 8:30 PM" />
          <TodayRow c="journaling" title="Night journal" time="1:05 AM – 1:15 AM" />
        </ul>
      </div>
      <TabBar />
    </div>
  );
}

const TODAY: [string, Clock, Clock][] = [
  ['sleep', [4, 0], [8, 45]],
  ['cs_fundamentals', [9, 0], [9, 45]],
  ['job', [11, 0], [18, 0]],
  ['dsa', [19, 0], [20, 30]],
  ['journaling', [1, 5], [1, 15]],
  ['sleep', [1, 15], [4, 0]],
];

function DayBar() {
  return (
    <div>
      <div className="relative h-9 overflow-hidden rounded-[10px] bg-muted">
        {TODAY.map(([c, from, to]) => (
          <span
            key={`${c}${from.join(':')}`}
            data-anim="home-block"
            style={{ ...cat(c), ...span(from, to) }}
            className="absolute inset-y-0 min-w-[2px] cat-dot opacity-35"
          />
        ))}
        <span
          data-anim="home-now"
          style={{ left: `${dayPos(HOME_NOW)}%` }}
          className="absolute inset-y-0 w-[2px] bg-primary"
        />
      </div>
      <DayLabels className="mt-1 h-3.5 text-[11px] leading-[14px]" />
    </div>
  );
}

function TodayRow({
  c,
  title,
  time,
  done,
}: {
  c: string;
  title: string;
  time: string;
  done?: boolean;
}) {
  return (
    <li
      style={cat(c)}
      className="flex items-center gap-3 border-l-[3px] cat-edge px-3.5 py-3 [&+&]:border-t [&+&]:border-t-border"
    >
      <span
        className={cn(
          'grid size-6 shrink-0 place-items-center rounded-full border-[1.5px]',
          done ? 'border-primary bg-primary text-primary-foreground' : 'border-input',
        )}
      >
        {done ? <Check className="size-3.5" strokeWidth={3} /> : null}
      </span>
      <span className="grid">
        <span className={cn('text-[15px]', done && 'text-muted-foreground')}>{title}</span>
        <span className="text-[13px] text-muted-foreground tabular">{time}</span>
      </span>
    </li>
  );
}

function TabBar() {
  const tabs = [
    ['Home', House],
    ['Schedule', CalendarDays],
    ['Learn', BookOpen],
    ['Journal', NotebookPen],
    ['Profile', CircleUserRound],
  ] as const;
  return (
    <div className="grid h-[84px] grid-cols-5 border-t bg-nav pb-[26px]">
      {tabs.map(([label, Icon], i) => (
        <span
          key={label}
          className={cn(
            'flex flex-col items-center justify-center gap-[3px] text-[11px] font-medium',
            i === 0 ? 'text-primary' : 'text-muted-foreground',
          )}
        >
          <Icon className="size-[23px]" strokeWidth={i === 0 ? 2.2 : 1.8} />
          {label}
        </span>
      ))}
    </div>
  );
}

/** The night journal's study-log step: a spoken walk-through, with typing as the other way. */
export function NightPreview() {
  return (
    <div className="night flex h-full flex-col">
      <div className="h-[44px]" />
      <div className="grid h-[52px] grid-cols-[44px_1fr_44px] items-center px-2">
        <X className="mx-auto size-5 text-night-muted" />
        <div className="text-center leading-tight">
          <p className="text-[15px]">Tonight</p>
          <p className="text-[13px] text-night-muted">bed at 1:15 AM</p>
        </div>
      </div>
      <div className="mt-2 grid grid-cols-4 gap-2 px-6">
        {[true, true, false, false].map((on, i) => (
          <span
            key={i}
            className={cn('h-[3px] rounded-full', on ? 'bg-night-glow' : 'bg-white/15')}
          />
        ))}
      </div>
      <div className="mt-10 px-6">
        <p className="text-[27px] leading-[1.28] tracking-[-0.015em]">
          Walk me through what you studied.
        </p>
        <p className="mt-3 text-[16px] leading-relaxed text-night-muted">
          Topic by topic: what clicked, what didn’t, and how the problems went.
        </p>
        <div className="mt-6 inline-grid grid-cols-2 rounded-[12px] bg-white/[0.06] p-1 text-[15px]">
          <span className="rounded-[9px] bg-white/[0.1] px-5 py-1.5 text-night-glow">Talk</span>
          <span className="px-5 py-1.5 text-night-muted">Type</span>
        </div>
      </div>
      <div className="mt-14 grid justify-items-center gap-4">
        <span className="grid size-[104px] place-items-center rounded-full bg-night-glow text-night shadow-[0_0_0_12px_oklch(0.82_0.11_76/0.14),0_0_60px_oklch(0.82_0.11_76/0.35)]">
          <Mic className="size-10" />
        </span>
        <p className="text-[15px] text-night-muted">Tap to talk</p>
      </div>
      <div className="mt-auto flex items-center gap-3 px-6 pb-10">
        <span className="px-4 text-[16px] text-night-muted">Back</span>
        <span className="flex h-12 flex-1 items-center justify-center rounded-[14px] bg-night-glow text-[16px] font-medium text-night">
          Next
        </span>
      </div>
    </div>
  );
}
