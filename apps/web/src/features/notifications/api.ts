import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';
import type { NotificationItem, PushDevice } from '@/api/types';

// ── Push devices ─────────────────────────────────────────────────────────────

/** Whether the server can send push, and the VAPID public key devices subscribe with. */
export function usePushConfig() {
  return useQuery({
    queryKey: ['push-config'],
    queryFn: () => api<{ enabled: boolean; publicKey: string | null }>('/v1/push/config'),
    staleTime: 10 * 60_000,
  });
}

export function usePushDevices() {
  return useQuery({
    queryKey: ['push-devices'],
    queryFn: () => api<{ subscriptions: PushDevice[] }>('/v1/push/subscriptions'),
  });
}

/** Registers (or refreshes) this device's push subscription. */
export function savePushSubscription(subscription: PushSubscriptionJSON, deviceLabel: string) {
  return api('/v1/push/subscriptions', {
    method: 'POST',
    body: { ...subscription, deviceLabel },
  });
}

/** Forgets this device's subscription (used when turning reminders off here). */
export function unsubscribePushEndpoint(endpoint: string) {
  return api('/v1/push/unsubscribe', { method: 'POST', body: { endpoint } });
}

export function removePushDevice(subscriptionId: string) {
  return api(`/v1/push/subscriptions/${subscriptionId}`, { method: 'DELETE' });
}

/** Sends a test notification to every device; one result per device. */
export function sendTestNotification() {
  return api<{ results: Array<{ statusCode: number | null; error: string | null }> }>(
    '/v1/push/test',
    { method: 'POST' },
  );
}

// ── Notification log ─────────────────────────────────────────────────────────

export function useNotificationLog() {
  return useQuery({
    queryKey: ['notifications'],
    queryFn: () =>
      api<{ notifications: NotificationItem[] }>('/v1/notifications', { query: { limit: 30 } }),
    networkMode: 'online',
  });
}

export function useUpcomingNotifications() {
  return useQuery({
    queryKey: ['notifications-upcoming'],
    queryFn: () =>
      api<{ notifications: NotificationItem[] }>('/v1/notifications/upcoming', {
        query: { limit: 12 },
      }),
  });
}

export function skipNotification(notificationId: string) {
  return api(`/v1/notifications/${notificationId}/skip`, { method: 'POST' });
}

export function snoozeNotification(notificationId: string, minutes: number) {
  return api(`/v1/notifications/${notificationId}/snooze`, { method: 'POST', body: { minutes } });
}

/** Records that a notification was tapped (it opened the app with `?n=<id>`). */
export function reportNotificationClick(notificationId: string) {
  return api(`/v1/notifications/${notificationId}/events`, {
    method: 'POST',
    body: { type: 'clicked' },
  });
}
