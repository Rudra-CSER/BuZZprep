import { Bell, ChevronsUpDown, CircleUserRound, LogOut, MonitorSmartphone } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useMe } from '@/features/auth/api';
import { useSignOut } from '@/features/auth/hooks/useSignOut';
import { isStandalone } from '@/lib/pwa';
import { cn } from '@/lib/utils';

/**
 * You, at the foot of the rail or sidebar: profile and settings, notifications, install, sign out.
 * `compact` shows just the initials (tablet rail).
 */
export function AccountMenu({ compact }: { compact?: boolean }) {
  const { data: me } = useMe();
  const navigate = useNavigate();
  const signOut = useSignOut();
  const { pathname } = useLocation();
  const here = pathname === '/profile' || pathname === '/profile/notifications';
  const name = me?.user.displayName ?? '';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {compact ? (
          <button
            type="button"
            aria-label={`Account and settings for ${name}`}
            className={cn(
              'grid size-12 place-items-center rounded-full transition-colors hover:bg-white/[0.08]',
              here && 'bg-white/[0.12]',
            )}
          >
            <Initials name={name} />
          </button>
        ) : (
          <button
            type="button"
            className={cn(
              'flex w-full min-w-0 items-center gap-3 rounded-[12px] px-3 py-2 text-left transition-colors hover:bg-white/[0.06]',
              here && 'bg-white/[0.12]',
            )}
          >
            <Initials name={name} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[14px] font-medium">{name}</span>
              <span className="block truncate text-[12px] text-chrome-muted" title={me?.user.email}>
                {me?.user.email}
              </span>
            </span>
            <ChevronsUpDown className="size-4 shrink-0 text-chrome-muted" />
          </button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        side={compact ? 'right' : 'top'}
        align={compact ? 'end' : 'start'}
        className="w-64"
      >
        <div className="px-2.5 pb-2 pt-1.5">
          <p className="truncate text-[14px] font-medium">{name}</p>
          <p className="break-all text-[13px] text-muted-foreground">{me?.user.email}</p>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => navigate('/profile')}>
          <CircleUserRound /> Profile and settings
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => navigate('/profile/notifications')}>
          <Bell /> Notifications
        </DropdownMenuItem>
        {!isStandalone() && (
          <DropdownMenuItem onSelect={() => navigate('/install')}>
            <MonitorSmartphone /> Install the app
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => void signOut()}>
          <LogOut /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function Initials({ name }: { name: string }) {
  const letters =
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word[0]!.toUpperCase())
      .join('') || '?';
  return (
    <span
      aria-hidden
      className="grid size-9 shrink-0 place-items-center rounded-full bg-chrome-accent/25 text-[13px] font-semibold"
    >
      {letters}
    </span>
  );
}
