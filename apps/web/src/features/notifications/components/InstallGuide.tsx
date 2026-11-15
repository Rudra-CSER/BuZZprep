import { BellRing, Share, Smartphone, SquarePlus } from 'lucide-react';
import type { ReactNode } from 'react';
import { isIOS } from '@/lib/pwa';

const IOS_STEPS: Array<{ icon: ReactNode; title: string; body: string }> = [
  {
    icon: <Share />,
    title: 'Open the Share menu',
    body: 'In Safari, tap the ••• button next to the address bar, then Share. On older versions of iOS, or with a tab bar showing, tap the Share button (a square with an arrow) directly.',
  },
  {
    icon: <SquarePlus />,
    title: 'Add to Home Screen',
    body: 'Scroll down and choose Add to Home Screen. Keep “Open as Web App” switched on if you see it, then tap Add.',
  },
  {
    icon: <Smartphone />,
    title: 'Open buZZprep from the Home Screen',
    body: 'Close Safari and launch the new icon. Sign in there — the installed app keeps its own session.',
  },
  {
    icon: <BellRing />,
    title: 'Turn on reminders',
    body: 'Go to Profile → Notifications in the installed app and tap Turn on reminders. iOS only allows this from the Home Screen app.',
  },
];

const OTHER_STEPS: Array<{ icon: ReactNode; title: string; body: string }> = [
  {
    icon: <SquarePlus />,
    title: 'Install the app',
    body: 'In Chrome or Edge, use the install icon in the address bar, or the menu → Install buZZprep. On Android, choose Add to Home screen.',
  },
  {
    icon: <BellRing />,
    title: 'Turn on reminders',
    body: 'Open Profile → Notifications and tap Turn on reminders, then allow notifications when the browser asks.',
  },
];

/** Step-by-step install instructions, iPhone first (there is no install prompt on iOS). */
export function InstallGuide({ forceIOS }: { forceIOS?: boolean }) {
  const steps = forceIOS || isIOS() ? IOS_STEPS : OTHER_STEPS;
  return (
    <ol className="grid gap-3">
      {steps.map((s, i) => (
        <li key={s.title} className="flex gap-3.5 rounded-[14px] border bg-card p-4">
          <span
            className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-accent text-accent-foreground [&_svg]:size-[18px]"
            aria-hidden
          >
            {s.icon}
          </span>
          <span className="grid gap-0.5">
            <span className="text-[15px] font-semibold">
              <span className="sr-only">Step {i + 1}: </span>
              {s.title}
            </span>
            <span className="text-[14px] leading-snug text-muted-foreground">{s.body}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}
