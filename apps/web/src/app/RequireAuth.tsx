import { WifiOff } from 'lucide-react';
import { Navigate, Outlet, useLocation } from 'react-router';
import { Logo } from '@/components/Logo';
import { StatusBarBackdrop } from '@/components/StatusBarBackdrop';
import { Button } from '@/components/ui/button';
import { useMe } from '@/features/auth/api';

/**
 * Renders its routes only for a signed-in user, and sends new accounts through setup first.
 * Someone signed out who opens the app's address sees the preview page; a deep link to a page
 * asks them to sign in and comes back afterwards.
 */
export function RequireAuth() {
  const { data: me, isPending, isError, refetch } = useMe();
  const location = useLocation();
  const atRoot = location.pathname === '/';
  if (isPending) return <Splash />;
  if (isError && me === undefined) {
    // Nothing cached and no server answer: a visitor is better served by the preview.
    if (atRoot) return <Navigate to="/welcome" replace />;
    return (
      <div className="grid min-h-dvh place-items-center px-6 text-center">
        <StatusBarBackdrop />
        <div className="grid justify-items-center gap-3">
          <WifiOff className="size-7 text-muted-foreground" />
          <p className="text-[17px] font-semibold">Can’t reach buZZprep</p>
          <p className="max-w-xs text-[14px] text-muted-foreground">
            Check your connection. Data you opened before is still available once you’re signed in.
          </p>
          <Button variant="tinted" onClick={() => void refetch()}>
            Try again
          </Button>
        </div>
      </div>
    );
  }
  if (!me) {
    if (atRoot) return <Navigate to="/welcome" replace />;
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }
  if (!me.onboardingCompleted && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />;
  }
  return <Outlet />;
}

function Splash() {
  return (
    <div className="grid min-h-dvh place-items-center">
      <StatusBarBackdrop />
      <Logo className="size-12 animate-pulse rounded-[14px]" />
    </div>
  );
}
