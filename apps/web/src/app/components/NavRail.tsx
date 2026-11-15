import { WifiOff } from 'lucide-react';
import { Link, NavLink } from 'react-router';
import { Logo } from '@/components/Logo';
import { cn } from '@/lib/utils';
import { AccountMenu } from './AccountMenu';
import { PRIMARY_NAV } from './nav-items';

/** Tablets and phones held sideways: a narrow ink rail, clear of the Dynamic Island's side. */
export function NavRail({ online }: { online: boolean }) {
  return (
    <aside className="chrome sticky top-0 hidden h-dvh w-[calc(5.5rem+var(--safe-left))] shrink-0 flex-col items-center pb-[calc(var(--safe-bottom)+1rem)] pl-[var(--safe-left)] pt-[calc(var(--safe-top)+1rem)] md:flex lg:hidden">
      <Link to="/" aria-label="buZZprep home" className="mb-6 rounded-[12px] short:mb-3">
        <Logo decorative className="size-10 rounded-[11px]" />
      </Link>
      <nav aria-label="Main" className="grid w-full gap-1 px-2">
        {PRIMARY_NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center gap-1 rounded-[14px] py-2.5 text-[11px] font-medium transition-colors short:py-1.5',
                isActive
                  ? 'bg-white/[0.12] text-chrome-foreground'
                  : 'text-chrome-muted hover:bg-white/[0.06] hover:text-chrome-foreground',
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon className="size-[22px]" strokeWidth={isActive ? 2.2 : 1.8} />
                {label}
              </>
            )}
          </NavLink>
        ))}
      </nav>
      <div className="mt-auto grid justify-items-center gap-3">
        {!online && (
          <span className="grid size-9 place-items-center rounded-full bg-warning/20 text-warning">
            <WifiOff className="size-4" />
            <span className="sr-only">Offline</span>
          </span>
        )}
        <AccountMenu compact />
      </div>
    </aside>
  );
}
