import type { NotificationPreferences } from '@buzzprep/shared';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';
import { errorMessage } from '@/api/client';
import { Page } from '@/components/Page';
import { Skeleton } from '@/components/ui/skeleton';
import { useProfile, useUpdateProfile } from '@/features/profile/api';
import { useTimeContext } from '@/features/profile/hooks/useTimeContext';
import {
  sendTestNotification,
  useNotificationLog,
  usePushConfig,
  usePushDevices,
  useUpcomingNotifications,
} from './api';
import { DeliveryLogSection } from './components/DeliveryLogSection';
import { DeviceCard } from './components/DeviceCard';
import { DevicesSection } from './components/DevicesSection';
import { PreferencesSections } from './components/PreferencesSections';
import { Reliability } from './components/Reliability';
import { UpcomingSection } from './components/UpcomingSection';
import { useDeviceState } from './hooks/useDeviceState';
import { disablePush, enablePush } from './push';

export function NotificationsPage() {
  const qc = useQueryClient();
  const t = useTimeContext();
  const config = usePushConfig();
  const devices = usePushDevices();
  const { data: profileData } = useProfile();
  const updateProfile = useUpdateProfile();
  const upcoming = useUpcomingNotifications();
  const log = useNotificationLog();
  const { state, refresh } = useDeviceState(config.data?.enabled);
  const [busy, setBusy] = useState(false);
  const prefs = profileData?.profile.notifications as NotificationPreferences | undefined;

  const turnOn = () => {
    const key = config.data?.publicKey;
    if (!key) return;
    setBusy(true);
    // No await before enablePush: iOS requires the permission request to come straight from the tap.
    enablePush(key)
      .then(async (result) => {
        if (result === 'granted') toast.success('Reminders are on for this device');
        else if (result === 'denied')
          toast.error('Notifications were blocked. You can allow them in Settings.');
        await qc.invalidateQueries({ queryKey: ['push-devices'] });
        await refresh();
      })
      .catch((err) => toast.error(errorMessage(err)))
      .finally(() => setBusy(false));
  };

  const turnOff = async () => {
    setBusy(true);
    try {
      await disablePush();
      await qc.invalidateQueries({ queryKey: ['push-devices'] });
      await refresh();
      toast('Reminders are off for this device');
    } finally {
      setBusy(false);
    }
  };

  const test = async () => {
    setBusy(true);
    try {
      const res = await sendTestNotification();
      const ok = res.results.filter((r) => r.statusCode && r.statusCode < 300).length;
      if (ok > 0)
        toast.success(
          `Test sent to ${ok} device${ok === 1 ? '' : 's'}. It should arrive within seconds.`,
        );
      else
        toast.error('The push service rejected the test. Try turning reminders off and on again.');
      await qc.invalidateQueries({ queryKey: ['notifications'] });
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const setPrefs = (patch: Partial<NotificationPreferences>) => {
    if (!prefs) return;
    updateProfile.mutate({ notifications: { ...prefs, ...patch } } as never, {
      onError: (e) => toast.error(errorMessage(e)),
    });
  };

  const onDeviceRemoved = () => {
    void qc.invalidateQueries({ queryKey: ['push-devices'] });
    void refresh();
  };

  return (
    <Page title="Notifications" back={{ to: '/profile', label: 'Profile' }}>
      <div className="grid gap-7">
        <DeviceCard
          state={state}
          busy={busy}
          onTurnOn={turnOn}
          onTurnOff={() => void turnOff()}
          onTest={() => void test()}
        />

        {devices.data && devices.data.subscriptions.length > 0 && (
          <DevicesSection devices={devices.data.subscriptions} t={t} onRemoved={onDeviceRemoved} />
        )}

        {prefs ? (
          <PreferencesSections prefs={prefs} setPrefs={setPrefs} />
        ) : (
          <Skeleton className="h-64 w-full rounded-[14px]" />
        )}

        <UpcomingSection
          notifications={upcoming.data?.notifications ?? []}
          deviceOn={state === 'on'}
          t={t}
        />

        <DeliveryLogSection notifications={log.data?.notifications ?? []} t={t} />

        <Reliability />
      </div>
    </Page>
  );
}
