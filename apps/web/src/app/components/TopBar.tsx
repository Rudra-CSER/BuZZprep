import { Bell, WifiOff } from 'lucide-react';
import { useRef } from 'react';
import { Link, useLocation } from 'react-router';
import { Logo } from '@/components/Logo';
import { Wordmark } from '@/components/Wordmark';
import { cn } from '@/lib/utils';
import { useCollapsedTitle } from '../hooks/useCollapsedTitle';
import { countdownLabel, usePlanCountdown } from '../hooks/usePlanCountdown';

/**
 * The phone header. It starts under the status bar and Dynamic Island, in the same ink, so the
 * island sits inside the bar instead of floating over the page. Rounded corners hang from its
 * bottom edge, so the page always reads as a sheet tucked under it, scrolled or not. Once the
 * page's large title scrolls away, the title moves into the bar.
 */
export function TopBar({ online }: { online: boolean }) {
  const bar = useRef<HTMLElement>(null);
  const title = useCollapsedTitle(bar);
  const { pathname } = useLocation();
  const countdown = usePlanCountdown();
  const label = countdown ? countdownLabel(countdown) : null;
  // Home already shows the plan's journey at the top of the page.
  const showPlan = online && countdown && label && pathname !== '/';

  return (
    <header ref={bar} className="chrome sticky top-0 z-30 pt-[var(--safe-top)] safe-x md:hidden">
      <div className="relative flex h-[52px] items-center gap-2 pl-4 pr-1.5">
        <Link to="/" className="flex min-w-0 items-center gap-2.5 rounded-[10px]">
          <Logo decorative className="size-[26px] rounded-[8px]" />
          <Wordmark
            className={cn(
              'text-[20px] leading-none transition-opacity duration-200 max-[359px]:sr-only',
              title && 'opacity-0',
            )}
          />
        </Link>

        <p
          aria-hidden
          className={cn(
            'pointer-events-none absolute inset-x-16 truncate text-center font-display text-[17px] font-semibold transition-[opacity,translate] duration-200',
            title ? 'translate-y-0 opacity-100' : 'translate-y-1 opacity-0',
          )}
        >
          {title}
        </p>

        <div className="ml-auto flex items-center gap-1">
          {!online ? (
            <span className="inline-flex h-8 items-center gap-1.5 rounded-full bg-warning/20 px-3 text-[13px] font-medium text-warning">
              <WifiOff className="size-3.5" /> Offline
            </span>
          ) : showPlan ? (
            <Link
              to="/profile/plan"
              aria-label={`Your plan: ${label}`}
              inert={Boolean(title)}
              className={cn(
                'inline-flex h-8 items-center gap-1.5 rounded-full bg-white/[0.08] pl-1.5 pr-3 text-[13px] font-medium tabular ring-1 ring-inset ring-white/[0.08] transition-[opacity,background-color] duration-200 hover:bg-white/[0.14]',
                title && 'opacity-0',
              )}
            >
              <ProgressRing percent={countdown.progress.percent} />
              {label}
            </Link>
          ) : null}
          <Link
            to="/profile/notifications"
            aria-label="Notifications"
            className="grid size-11 place-items-center rounded-full transition-colors hover:bg-white/[0.1]"
          >
            <Bell className="size-5" />
          </Link>
        </div>
      </div>

      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-full flex h-6 justify-between"
      >
        <span className="size-6 bg-[radial-gradient(circle_at_100%_100%,transparent_23.5px,var(--chrome)_24px)]" />
        <span className="size-6 bg-[radial-gradient(circle_at_0_100%,transparent_23.5px,var(--chrome)_24px)]" />
      </span>
    </header>
  );
}

/** How far through the plan you are, as a small gold ring. */
function ProgressRing({ percent }: { percent: number }) {
  const r = 6.5;
  const length = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 16 16" aria-hidden className="size-[18px] -rotate-90">
      <circle
        cx="8"
        cy="8"
        r={r}
        fill="none"
        stroke="currentColor"
        strokeOpacity={0.2}
        strokeWidth={2.25}
      />
      {percent > 0 ? (
        <circle
          cx="8"
          cy="8"
          r={r}
          fill="none"
          stroke="var(--gold)"
          strokeWidth={2.25}
          strokeLinecap="round"
          strokeDasharray={`${(Math.min(percent, 100) / 100) * length} ${length}`}
        />
      ) : null}
    </svg>
  );
}
