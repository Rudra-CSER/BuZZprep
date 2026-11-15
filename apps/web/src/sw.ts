/// <reference lib="webworker" />
import {
  cleanupOutdatedCaches,
  createHandlerBoundToURL,
  precacheAndRoute,
} from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';

declare let self: ServiceWorkerGlobalScope;

interface PushData {
  notificationId?: string;
  token?: string;
  url?: string;
  kind?: string;
}

interface DeclarativeNotification {
  title?: string;
  body?: string;
  navigate?: string;
  tag?: string;
  renotify?: boolean;
  icon?: string;
  badge?: string;
  timestamp?: number;
  data?: PushData;
  actions?: Array<{ action: string; title: string }>;
}

// ── App shell: precached build, SPA navigation fallback (never for /api) ─────
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();
registerRoute(
  new NavigationRoute(createHandlerBoundToURL('/index.html'), { denylist: [/^\/api\//] }),
);

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') void self.skipWaiting();
});

const HEADERS = { 'Content-Type': 'application/json', 'X-Requested-With': 'buzzprep' };

function report(data: PushData | undefined, body: Record<string, unknown>) {
  if (!data?.notificationId) return Promise.resolve();
  return fetch(`/api/v1/notifications/${data.notificationId}/events`, {
    method: 'POST',
    headers: HEADERS,
    credentials: 'same-origin',
    body: JSON.stringify({ ...body, token: data.token }),
  }).then(
    () => undefined,
    () => undefined,
  );
}

// ── Push ─────────────────────────────────────────────────────────────────────
// The server sends Declarative Web Push JSON ({ web_push: 8030, mutable: true, notification }).
//  • Safari 18.4+ (iOS / macOS): the browser parsed it already and passes the proposed
//    notification as `event.notification`; if we fail to show one in time, Safari shows it.
//  • Other browsers: the same JSON arrives in `event.data` and we render it ourselves.
self.addEventListener('push', (event: PushEvent) => {
  event.waitUntil(handlePush(event));
});

async function handlePush(event: PushEvent) {
  const proposed = (event as PushEvent & { notification?: Notification }).notification;
  let n: DeclarativeNotification;
  if (proposed) {
    n = {
      title: proposed.title,
      body: proposed.body,
      tag: proposed.tag,
      icon: proposed.icon,
      badge: (proposed as Notification & { badge?: string }).badge,
      data: proposed.data as PushData,
      navigate: (proposed as Notification & { navigate?: string }).navigate,
    };
  } else {
    let json: { notification?: DeclarativeNotification } & DeclarativeNotification;
    try {
      json = event.data?.json() ?? {};
    } catch {
      json = { title: 'buZZprep', body: event.data?.text() ?? '' };
    }
    n = json.notification ?? json;
  }

  const data: PushData = { ...(n.data ?? {}), url: n.data?.url ?? n.navigate ?? '/' };
  const options: NotificationOptions & {
    renotify?: boolean;
    timestamp?: number;
    actions?: Array<{ action: string; title: string }>;
  } = {
    body: n.body ?? '',
    tag: n.tag,
    renotify: !!n.tag,
    icon: n.icon ?? '/icons/icon-192.png',
    badge: n.badge ?? '/icons/badge-96.png',
    timestamp: n.timestamp,
    data,
    actions: n.actions?.map(({ action, title }) => ({ action, title })),
  };

  await self.registration.showNotification(n.title ?? 'buZZprep', options);
  await report(data, { type: 'delivered' });
}

// ── Taps and action buttons ─────────────────────────────────────────────────
self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close();
  const data = (event.notification.data ?? {}) as PushData;
  event.waitUntil(
    (async () => {
      // Android / desktop show action buttons: handle them without opening the app.
      if ((event.action === 'complete' || event.action === 'snooze') && data.token) {
        const res = await fetch(`/api/v1/notifications/${data.notificationId}/events`, {
          method: 'POST',
          headers: HEADERS,
          credentials: 'same-origin',
          body: JSON.stringify({ type: 'action', action: event.action, token: data.token }),
        }).catch(() => null);
        if (res?.ok) return;
      }
      await openApp(new URL(data.url ?? '/', self.location.origin).href);
    })(),
  );
});

async function openApp(url: string) {
  const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  for (const client of windows) {
    if (new URL(client.url).origin !== self.location.origin) continue;
    await client.focus();
    try {
      await client.navigate(url);
    } catch {
      client.postMessage({ type: 'navigate', url });
    }
    return;
  }
  await self.clients.openWindow(url);
}

// ── Subscription rotation (Chrome/Firefox) ──────────────────────────────────
self.addEventListener('pushsubscriptionchange', (event: Event) => {
  const e = event as ExtendableEvent;
  e.waitUntil(
    (async () => {
      const cfg = await fetch('/api/v1/push/config', { credentials: 'same-origin' }).then((r) =>
        r.ok ? r.json() : null,
      );
      if (!cfg?.publicKey) return;
      const key = Uint8Array.from(
        atob(
          cfg.publicKey.replace(/-/g, '+').replace(/_/g, '/') +
            '='.repeat((4 - (cfg.publicKey.length % 4)) % 4),
        ),
        (c) => c.charCodeAt(0),
      );
      const sub = await self.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: key,
      });
      await fetch('/api/v1/push/subscriptions', {
        method: 'POST',
        headers: HEADERS,
        credentials: 'same-origin',
        body: JSON.stringify(sub.toJSON()),
      });
    })().catch(() => undefined),
  );
});
