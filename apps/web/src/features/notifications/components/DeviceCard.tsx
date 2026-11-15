import { BellOff, BellRing, CircleAlert, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { isIOS } from '@/lib/pwa';
import type { DeviceState } from '../hooks/useDeviceState';
import { InstallGuide } from './InstallGuide';

export function DeviceCard({
  state,
  busy,
  onTurnOn,
  onTurnOff,
  onTest,
}: {
  state: DeviceState;
  busy: boolean;
  onTurnOn: () => void;
  onTurnOff: () => void;
  onTest: () => void;
}) {
  if (state === 'checking') return <Skeleton className="h-36 w-full rounded-[18px]" />;
  if (state === 'needs-install') {
    return (
      <section className="grid gap-4">
        <div className="flex items-start gap-3 rounded-[18px] border border-warning/40 bg-warning/10 p-4">
          <CircleAlert className="mt-0.5 size-5 shrink-0 text-warning" />
          <div className="grid gap-1">
            <p className="text-[16px] font-semibold">Add buZZprep to your Home Screen first</p>
            <p className="text-[14px] text-muted-foreground">
              {isIOS()
                ? 'On iPhone and iPad, web apps can only send notifications after they’re installed. It takes four taps:'
                : 'This browser can’t receive push notifications from a tab. Install the app first:'}
            </p>
          </div>
        </div>
        <InstallGuide />
      </section>
    );
  }
  const card = (icon: React.ReactNode, title: string, body: string, actions?: React.ReactNode) => (
    <section className="grid gap-4 rounded-[18px] border bg-card p-5">
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-accent text-accent-foreground [&_svg]:size-5">
          {icon}
        </span>
        <div className="grid gap-1">
          <p className="text-[17px] font-semibold">{title}</p>
          <p className="text-[14px] leading-snug text-muted-foreground">{body}</p>
        </div>
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </section>
  );
  switch (state) {
    case 'insecure':
      return card(
        <CircleAlert />,
        'HTTPS required',
        'Push notifications only work when buZZprep is served over HTTPS. Ask the server owner to enable it.',
      );
    case 'unsupported':
      return card(
        <BellOff />,
        'Not supported here',
        'This browser can’t receive web push notifications. Try Safari on iOS 16.4+, or a recent Chrome, Edge or Firefox.',
      );
    case 'server-off':
      return card(
        <BellOff />,
        'Push isn’t set up on this server',
        'The server owner needs to add VAPID keys (npm run vapid:generate) and restart. Until then, reminders only show inside the app.',
      );
    case 'denied':
      return card(
        <BellOff />,
        'Notifications are blocked',
        isIOS()
          ? 'Open iOS Settings → Notifications → buZZprep and allow notifications, then come back here.'
          : 'Allow notifications for this site in your browser’s site settings, then reload.',
      );
    case 'on':
      return card(
        <BellRing />,
        'Reminders are on for this device',
        'They’re sent from the server, so they arrive even when buZZprep is closed.',
        <>
          <Button variant="tinted" onClick={onTest} disabled={busy}>
            <Send /> Send a test
          </Button>
          <Button variant="ghost" onClick={onTurnOff} disabled={busy}>
            Turn off on this device
          </Button>
        </>,
      );
    default:
      return card(
        <BellRing />,
        'Get reminders on this device',
        'Session starts, overdue check-ins, your wake-up and wind-down — even when the app is closed.',
        <Button size="lg" onClick={onTurnOn} disabled={busy} className="w-full sm:w-auto">
          {busy ? 'Waiting for permission…' : 'Turn on reminders'}
        </Button>,
      );
  }
}
