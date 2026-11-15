import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { reportNotificationClick } from '@/features/notifications/api';
import { syncPushSubscription } from '@/features/notifications/push';

/** Records notification taps (`?n=<id>` deep links) and follows navigation requests from the SW. */
export function useNotificationLinks() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const n = params.get('n');

  useEffect(() => {
    if (!n) return;
    void reportNotificationClick(n).catch(() => undefined);
    const next = new URLSearchParams(params);
    next.delete('n');
    setParams(next, { replace: true });
  }, [n, params, setParams]);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    const onMessage = (e: MessageEvent) => {
      if (e.data?.type === 'navigate' && typeof e.data.url === 'string') {
        const url = new URL(e.data.url, window.location.origin);
        navigate(url.pathname + url.search);
      }
    };
    navigator.serviceWorker.addEventListener('message', onMessage);
    return () => navigator.serviceWorker.removeEventListener('message', onMessage);
  }, [navigate]);

  useEffect(() => {
    void syncPushSubscription();
  }, []);
}
