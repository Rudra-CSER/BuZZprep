import { afterEach, describe, expect, it, vi } from 'vitest';
import { isIOS, isStandalone, pushCapability } from '../pwa';

const IPHONE =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1';
const MAC =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Safari/605.1.15';

function device({
  ua,
  platform = 'iPhone',
  touch = 5,
  standalone = false,
  push = true,
  secure = true,
}: {
  ua: string;
  platform?: string;
  touch?: number;
  standalone?: boolean;
  push?: boolean;
  secure?: boolean;
}) {
  vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(ua);
  vi.spyOn(navigator, 'platform', 'get').mockReturnValue(platform);
  Object.defineProperty(navigator, 'maxTouchPoints', { value: touch, configurable: true });
  vi.spyOn(window, 'matchMedia').mockImplementation(
    (q: string) =>
      ({ matches: standalone && q.includes('standalone'), media: q }) as MediaQueryList,
  );
  Object.defineProperty(window, 'isSecureContext', { value: secure, configurable: true });
  if (push) {
    Object.defineProperty(window, 'PushManager', { value: class {}, configurable: true });
    Object.defineProperty(window, 'Notification', {
      value: { permission: 'default' },
      configurable: true,
    });
    Object.defineProperty(navigator, 'serviceWorker', { value: {}, configurable: true });
  } else {
    Reflect.deleteProperty(window, 'PushManager');
  }
}

afterEach(() => vi.restoreAllMocks());

describe('iOS detection', () => {
  it('recognises iPhones and iPads that report a Mac user agent', () => {
    device({ ua: IPHONE });
    expect(isIOS()).toBe(true);
    device({ ua: MAC, platform: 'MacIntel', touch: 5 });
    expect(isIOS()).toBe(true);
    device({ ua: MAC, platform: 'MacIntel', touch: 0 });
    expect(isIOS()).toBe(false);
  });
});

describe('push capability', () => {
  it('asks iPhone users in a Safari tab to install first', () => {
    device({ ua: IPHONE, standalone: false });
    expect(isStandalone()).toBe(false);
    expect(pushCapability()).toBe('needs-install');
  });

  it('supports push in the installed Home Screen app', () => {
    device({ ua: IPHONE, standalone: true });
    expect(pushCapability()).toBe('supported');
  });

  it('treats old iOS without PushManager as needing an install/update, and requires HTTPS', () => {
    device({ ua: IPHONE, standalone: true, push: false });
    expect(pushCapability()).toBe('needs-install');
    device({ ua: MAC, platform: 'MacIntel', touch: 0, secure: false });
    expect(pushCapability()).toBe('insecure');
  });
});
