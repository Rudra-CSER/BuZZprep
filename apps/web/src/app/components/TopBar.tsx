import { Bell, WifiOff } from 'lucide-react';
import { Link } from 'react-router';
import { Logo } from '@/components/Logo';
import { countdownLabel, usePlanCountdown } from '../hooks/usePlanCountdown';

/**
 * The phone header. It starts under the status bar and Dynamic Island, in the same ink, so the
 * island sits inside the bar instead of floating over the page.
 */
export function TopBar({ online }: { online: boolean }) {
  const countdown = usePlanCountdown();
  const label = countdown ? countdownLabel(countdown) : null;

  return (
    <header className="chrome sticky top-0 z-30 pt-[var(--safe-top)] safe-x md:hidden">
      <div className="flex h-[52px] items-center gap-3 px-4">
        <Link to="/" className="flex min-w-0 items-center gap-2 rounded-[10px]">
          <Logo decorative className="size-7 rounded-[8px]" />
          <span className="text-[17px] font-semibold tracking-[-0.01em] max-[359px]:sr-only">
            buZZprep
          </span>
        </Link>
        <div className="ml-auto flex items-center gap-1">
          {!online ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-warning/20 px-2.5 py-1 text-[13px] font-medium text-warning">
              <WifiOff className="size-3.5" /> Offline
            </span>
          ) : label ? (
            <Link
              to="/profile/plan"
              className="rounded-full bg-white/[0.1] px-2.5 py-1 text-[13px] font-medium tabular transition-colors hover:bg-white/[0.16]"
            >
              {label}
            </Link>
          ) : null}
          <Link
            to="/profile/notifications"
            aria-label="Notifications"
            className="grid size-10 place-items-center rounded-full transition-colors hover:bg-white/[0.1]"
          >
            <Bell className="size-[19px]" />
          </Link>
        </div>
      </div>
    </header>
  );
}
