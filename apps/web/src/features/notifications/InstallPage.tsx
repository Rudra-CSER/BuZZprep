import { CheckCircle2 } from 'lucide-react';
import { Page } from '@/components/Page';
import { isIOS, isStandalone } from '@/lib/pwa';
import { InstallGuide } from './components/InstallGuide';

export function InstallPage() {
  const installed = isStandalone();
  return (
    <Page title="Install buZZprep" back={{ to: '/profile', label: 'Profile' }}>
      {installed ? (
        <div className="flex items-start gap-3 rounded-[14px] border bg-card p-4">
          <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-success" />
          <p className="text-[15px]">
            You’re using the installed app. Reminders can be turned on from Profile → Notifications.
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          <p className="text-[15px] text-muted-foreground">
            {isIOS()
              ? 'On iPhone and iPad, notifications only work after buZZprep is added to the Home Screen.'
              : 'Installing gives buZZprep its own window, offline access and reliable notifications.'}
          </p>
          <InstallGuide />
        </div>
      )}
    </Page>
  );
}
