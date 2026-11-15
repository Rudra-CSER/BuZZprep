import { useEffect, useState } from 'react';
import { create } from 'zustand';

/**
 * One shared clock for the whole app (renders must not call Date.now() directly).
 * Ticks every 30 s and immediately when the app returns to the foreground.
 */
export const useClock = create<{ now: number }>(() => ({ now: Date.now() }));

if (typeof window !== 'undefined') {
  const tick = () => useClock.setState({ now: Date.now() });
  setInterval(tick, 30_000);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') tick();
  });
}

/** Current time: the shared 30-second clock, or a local faster tick (e.g. 1 s for timers). */
export function useNow(intervalMs = 30_000): number {
  const shared = useClock((s) => s.now);
  const [fast, setFast] = useState<number | null>(null);
  useEffect(() => {
    if (intervalMs >= 30_000) return;
    const id = setInterval(() => setFast(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return intervalMs >= 30_000 ? shared : Math.max(shared, fast ?? shared);
}
