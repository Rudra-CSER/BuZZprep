import { CalendarCog, Flag, ListChecks, WifiOff } from 'lucide-react';
import { Link, NavLink } from 'react-router';
import { Logo } from '@/components/Logo';
import { useReview } from '@/features/schedule/api';
import { cn } from '@/lib/utils';
import { AccountMenu } from './AccountMenu';
import { PRIMARY_NAV, type NavItem } from './nav-items';
import { PlanCountdown } from './PlanCountdown';

/** Laptops and desktops: the ink sidebar with the main places, your plan, and you. */
export function Sidebar({ online }: { online: boolean }) {
  const review = useReview();
  const undecided = review.data?.occurrences.length ?? 0;

  return (
    <aside className="chrome sticky top-0 hidden h-dvh w-[calc(16.5rem+var(--safe-left))] shrink-0 flex-col pb-[calc(var(--safe-bottom)+0.75rem)] pl-[var(--safe-left)] pt-[calc(var(--safe-top)+1.25rem)] lg:flex">
      <Link to="/" className="mx-5 mb-7 flex w-fit items-center gap-2.5 rounded-[10px]">
        <Logo decorative className="size-8 rounded-[9px]" />
        <span className="text-[18px] font-semibold tracking-[-0.015em]">buZZprep</span>
      </Link>

      <nav aria-label="Main" className="grid grid-cols-1 gap-0.5 px-3">
        {PRIMARY_NAV.map((item) => (
          <SidebarLink key={item.to} {...item} end />
        ))}
      </nav>

      <nav aria-labelledby="sidebar-plan" className="mt-7 grid grid-cols-1 gap-0.5 px-3">
        <p id="sidebar-plan" className="px-3 pb-1 text-[12px] font-medium text-chrome-muted">
          Your plan
        </p>
        <SidebarLink to="/schedule/routine" label="Routine" icon={CalendarCog} />
        <SidebarLink
          to="/schedule/review"
          label="Needs a decision"
          icon={ListChecks}
          badge={undecided}
        />
        <SidebarLink to="/profile/plan" label="Goal and milestones" icon={Flag} />
      </nav>

      <div className="mt-auto grid grid-cols-1 gap-2 px-3">
        <PlanCountdown />
        {!online && (
          <p className="flex items-center gap-1.5 px-3 py-1 text-[13px] text-warning">
            <WifiOff className="size-3.5" /> Offline — changes will sync
          </p>
        )}
        <AccountMenu />
      </div>
    </aside>
  );
}

function SidebarLink({ to, label, icon: Icon, end, badge }: NavItem & { badge?: number }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          'flex h-10 items-center gap-3 rounded-[10px] px-3 text-[15px] transition-colors',
          isActive
            ? 'bg-white/[0.12] font-medium text-chrome-foreground'
            : 'text-chrome-muted hover:bg-white/[0.06] hover:text-chrome-foreground',
        )
      }
    >
      <Icon className="size-[18px] shrink-0" />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {badge ? (
        <span className="min-w-5 rounded-full bg-warning px-1.5 text-center text-[12px] font-semibold leading-5 text-black/80 tabular">
          {badge}
          <span className="sr-only"> waiting</span>
        </span>
      ) : null}
    </NavLink>
  );
}
