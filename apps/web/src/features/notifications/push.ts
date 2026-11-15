/**
 * This device's Web Push subscription. Subscribing needs the server's VAPID public key; the
 * private key never leaves the server.
 */
import { deviceLabel, pushCapability } from '@/lib/pwa';
import { savePushSubscription, unsubscribePushEndpoint } from './api';

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'));
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

function sameKey(sub: PushSubscription, publicKey: string): boolean {
  const current = sub.options.applicationServerKey;
  if (!current) return true;
  const a = new Uint8Array(current);
  const b = urlBase64ToUint8Array(publicKey);
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

/**
 * Ask for permission and subscribe this device. MUST be called directly from a user gesture
 * (a tap): iOS ignores permission requests that happen after other async work.
 */
export async function enablePush(publicKey: string): Promise<'granted' | 'denied' | 'default'> {
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return permission;
  const reg = await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (sub && !sameKey(sub, publicKey)) {
    // Server keys changed (e.g. VAPID rotation): the old subscription can't be used.
    await sub.unsubscribe();
    sub = null;
  }
  sub ??= await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey),
  });
  await savePushSubscription(sub.toJSON(), deviceLabel());
  return 'granted';
}

export async function currentPushSubscription(): Promise<PushSubscription | null> {
  if (!('serviceWorker' in navigator)) return null;
  const reg = await navigator.serviceWorker.getRegistration();
  return (await reg?.pushManager.getSubscription()) ?? null;
}

export async function disablePush(): Promise<void> {
  const sub = await currentPushSubscription();
  if (!sub) return;
  await unsubscribePushEndpoint(sub.endpoint).catch(() => undefined);
  await sub.unsubscribe();
}

/** Keep the server's copy of this device's subscription fresh (endpoints can rotate). */
export async function syncPushSubscription(): Promise<void> {
  if (pushCapability() !== 'supported' || Notification.permission !== 'granted') return;
  const sub = await currentPushSubscription();
  if (!sub) return;
  await savePushSubscription(sub.toJSON(), deviceLabel()).catch(() => undefined);
}
