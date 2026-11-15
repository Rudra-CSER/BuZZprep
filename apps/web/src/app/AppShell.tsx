import { Outlet } from 'react-router';
import { StatusBarBackdrop } from '@/components/StatusBarBackdrop';
import { NavRail } from './components/NavRail';
import { Sidebar } from './components/Sidebar';
import { TabBar } from './components/TabBar';
import { TopBar } from './components/TopBar';
import { useNotificationLinks } from './hooks/useNotificationLinks';
import { useOnline } from './hooks/useOnline';

/**
 * The signed-in layout, one per screen size:
 * - phones: an ink top bar wrapped around the Dynamic Island, the page as a sheet beneath it, and
 *   a tab bar above the home indicator;
 * - tablets, and phones held sideways: a narrow ink rail;
 * - laptops and desktops: an ink sidebar with your plan and your account.
 */
export function AppShell() {
  useNotificationLinks();
  const online = useOnline();

  return (
    <div className="flex min-h-dvh flex-col bg-chrome md:flex-row md:bg-background">
      <TopBar online={online} />
      <NavRail online={online} />
      <Sidebar online={online} />
      <main className="relative min-w-0 flex-1 rounded-t-[24px] bg-background pb-[calc(76px+var(--safe-bottom))] [--app-top:0px] md:rounded-none md:pb-[calc(3rem+var(--safe-bottom))] md:pr-[var(--safe-right)] md:[--app-top:var(--safe-top)]">
        <Outlet />
      </main>
      <TabBar />
      <StatusBarBackdrop className="hidden md:block" />
    </div>
  );
}
