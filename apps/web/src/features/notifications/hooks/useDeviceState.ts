import { useEffect, useState } from 'react';
import { notificationPermission, pushCapability } from '@/lib/pwa';
import { currentPushSubscription } from '../push';

export type DeviceState =
  | 'checking'
  | 'needs-install'
  | 'unsupported'
  | 'insecure'
  | 'server-off'
  | 'denied'
  | 'off'
  | 'on';

/** Derives this device's push state; only the subscription lookup is asynchronous. */
export function useDeviceState(serverEnabled: boolean | undefined) {
  const [version, setVersion] = useState(0);
  const [subscribed, setSubscribed] = useState<{ version: number; value: boolean } | null>(null);
  useEffect(() => {
    let alive = true;
    void currentPushSubscription().then((sub) => {
      if (alive) setSubscribed({ version, value: !!sub && notificationPermission() === 'granted' });
    });
    return () => {
      alive = false;
    };
  }, [version]);

  const cap = pushCapability();
  let state: DeviceState;
  if (cap !== 'supported') state = cap;
  else if (serverEnabled === false) state = 'server-off';
  else if (notificationPermission() === 'denied') state = 'denied';
  else if (!subscribed || serverEnabled === undefined) state = 'checking';
  else state = subscribed.value ? 'on' : 'off';
  return { state, refresh: async () => setVersion((v) => v + 1) };
}
