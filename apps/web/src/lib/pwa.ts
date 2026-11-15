// What this browser and device can do: iOS and Home Screen detection, push support, wake lock.

export function isIOS(): boolean {
  const ua = navigator.userAgent;
  // iPadOS 13+ reports itself as a Mac; touch support gives it away.
  return (
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}

export function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export type PushCapability =
  | 'supported'
  | 'needs-install' // iOS/iPadOS Safari tab: Web Push only works from the Home Screen app
  | 'insecure' // not HTTPS (localhost excepted)
  | 'unsupported';

export function pushCapability(): PushCapability {
  if (!window.isSecureContext) return 'insecure';
  if (isIOS() && !isStandalone()) return 'needs-install';
  if (
    !('serviceWorker' in navigator) ||
    !('PushManager' in window) ||
    !('Notification' in window)
  ) {
    return isIOS() ? 'needs-install' : 'unsupported';
  }
  return 'supported';
}

export function notificationPermission(): NotificationPermission | 'unsupported' {
  return 'Notification' in window ? Notification.permission : 'unsupported';
}

export function deviceLabel(): string {
  const ua = navigator.userAgent;
  const device = /iPhone/.test(ua)
    ? 'iPhone'
    : /iPad/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
      ? 'iPad'
      : /Android/.test(ua)
        ? 'Android'
        : /Mac/.test(ua)
          ? 'Mac'
          : /Windows/.test(ua)
            ? 'Windows'
            : /Linux/.test(ua)
              ? 'Linux'
              : 'Device';
  const browser = /Edg\//.test(ua)
    ? 'Edge'
    : /Firefox\//.test(ua)
      ? 'Firefox'
      : /Chrome\//.test(ua)
        ? 'Chrome'
        : /Safari\//.test(ua)
          ? 'Safari'
          : 'Browser';
  return `${device} · ${isStandalone() ? 'installed app' : browser}`;
}

/** Screen Wake Lock keeps the focus timer visible (iOS 18.4+ in installed apps). */
export async function requestWakeLock(): Promise<{ release(): Promise<void> } | null> {
  try {
    const wl = (
      navigator as Navigator & {
        wakeLock?: { request(type: 'screen'): Promise<{ release(): Promise<void> }> };
      }
    ).wakeLock;
    return wl ? await wl.request('screen') : null;
  } catch {
    return null;
  }
}
