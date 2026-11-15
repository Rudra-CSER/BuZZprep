import { toast } from 'sonner';
import { registerSW } from 'virtual:pwa-register';

export function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      toast('A new version of buZZprep is ready.', {
        duration: Infinity,
        action: { label: 'Update', onClick: () => void updateSW(true) },
      });
    },
    onOfflineReady() {
      toast('buZZprep now works offline.');
    },
    onRegisteredSW(_url, registration) {
      // Installed apps can stay open for days; check for updates hourly.
      if (registration)
        setInterval(() => void registration.update().catch(() => undefined), 3_600_000);
    },
  });
}
