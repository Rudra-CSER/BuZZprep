import { NavLink } from 'react-router';
import { cn } from '@/lib/utils';
import { PRIMARY_NAV, PROFILE_NAV } from './nav-items';

/** The phone tab bar, above the home indicator. */
export function TabBar() {
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-nav backdrop-blur-xl backdrop-saturate-150 safe-bottom safe-x md:hidden"
    >
      <div className="mx-auto grid h-[58px] max-w-lg grid-cols-5">
        {[...PRIMARY_NAV, PROFILE_NAV].map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center justify-center gap-[3px] text-[11px] font-medium transition-colors',
                isActive ? 'text-primary' : 'text-muted-foreground',
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon className="size-[23px]" strokeWidth={isActive ? 2.2 : 1.8} />
                {label}
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
