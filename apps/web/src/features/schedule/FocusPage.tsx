import { CATEGORY_META } from '@buzzprep/shared';
import { Pause, Play, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { toast } from 'sonner';
import { StatusBarBackdrop } from '@/components/StatusBarBackdrop';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useNow } from '@/lib/clock';
import { requestWakeLock } from '@/lib/pwa';
import { catVar } from '@/lib/utils';
import { useOccurrence, useUpdateOccurrence } from './api';

interface TimerState {
  startedAt: number;
  pausedMs: number;
  pausedAt: number | null;
}

function load(key: string): TimerState {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw) as TimerState;
  } catch {
    /* ignore */
  }
  return { startedAt: Date.now(), pausedMs: 0, pausedAt: null };
}

function clock(ms: number) {
  const total = Math.max(0, Math.round(Math.abs(ms) / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

/** "Start today's session": a distraction-free timer that records real minutes on finish. */
export function FocusPage() {
  const { activityId, date } = useParams();
  const navigate = useNavigate();
  const { data } = useOccurrence(activityId, date);
  const update = useUpdateOccurrence();
  const key = `bp-focus:${activityId}:${date}`;
  const [timer, setTimer] = useState<TimerState>(() => load(key));
  const now = useNow(1000);

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(timer));
  }, [key, timer]);

  useEffect(() => {
    let lock: Awaited<ReturnType<typeof requestWakeLock>> = null;
    const acquire = async () => {
      if (document.visibilityState === 'visible') lock = await requestWakeLock();
    };
    void acquire();
    document.addEventListener('visibilitychange', acquire);
    return () => {
      document.removeEventListener('visibilitychange', acquire);
      void lock?.release();
    };
  }, []);

  if (!data) {
    return (
      <div className="mx-auto max-w-md px-6 safe-top pt-10">
        <Skeleton className="h-80 w-full rounded-[20px]" />
      </div>
    );
  }

  const o = data.occurrence;
  const elapsed =
    now - timer.startedAt - timer.pausedMs - (timer.pausedAt ? now - timer.pausedAt : 0);
  const planned = o.durationMinutes * 60_000;
  const remaining = planned - elapsed;
  const progress = planned > 0 ? Math.min(1, elapsed / planned) : 0;
  const r = 118;
  const circumference = 2 * Math.PI * r;

  const togglePause = () =>
    setTimer((t) =>
      t.pausedAt
        ? { ...t, pausedMs: t.pausedMs + (Date.now() - t.pausedAt), pausedAt: null }
        : { ...t, pausedAt: Date.now() },
    );

  const finish = () => {
    const minutes = Math.max(1, Math.round(elapsed / 60_000));
    update.mutate({
      activityId: o.activityId,
      date: o.date,
      body: { status: 'completed', actualMinutes: minutes },
    });
    localStorage.removeItem(key);
    toast.success(`${o.title} done — ${minutes} min logged`);
    navigate('/', { replace: true });
  };

  const leave = () => {
    localStorage.removeItem(key);
    navigate(-1);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-background pt-[max(var(--safe-top),0.75rem)]"
      style={catVar(o.category)}
    >
      <StatusBarBackdrop />
      <div className="flex items-center justify-between px-4 pt-2">
        <Button variant="ghost" size="icon" onClick={leave} aria-label="Leave focus session">
          <X />
        </Button>
        <span className="text-[13px] font-medium cat-text">{CATEGORY_META[o.category].label}</span>
        <span className="size-10" />
      </div>
      <div className="flex flex-1 flex-col items-center justify-center gap-8 px-6">
        <h1 className="max-w-sm text-center text-[22px] font-semibold leading-snug tracking-[-0.015em]">
          {o.title}
        </h1>
        <div className="relative grid size-[264px] place-items-center">
          <svg viewBox="0 0 264 264" className="absolute inset-0 -rotate-90" aria-hidden>
            <circle cx="132" cy="132" r={r} fill="none" strokeWidth="8" className="stroke-muted" />
            <circle
              cx="132"
              cy="132"
              r={r}
              fill="none"
              strokeWidth="8"
              strokeLinecap="round"
              stroke="var(--primary)"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - progress)}
              className="transition-[stroke-dashoffset] duration-1000 ease-linear"
            />
          </svg>
          <div className="grid justify-items-center gap-1" aria-live="off">
            <span className="text-[54px] font-semibold leading-none tracking-[-0.03em] narrow tabular">
              {remaining >= 0 ? clock(remaining) : `+${clock(remaining)}`}
            </span>
            <span className="text-[14px] text-muted-foreground">
              {timer.pausedAt
                ? 'Paused'
                : remaining >= 0
                  ? `of ${o.durationMinutes} min`
                  : 'over the plan — nice'}
            </span>
          </div>
        </div>
      </div>
      <div className="mx-auto grid w-full max-w-md grid-cols-[auto_1fr] gap-2 px-6 pb-[max(var(--safe-bottom),20px)]">
        <Button
          size="lg"
          variant="secondary"
          onClick={togglePause}
          aria-label={timer.pausedAt ? 'Resume' : 'Pause'}
        >
          {timer.pausedAt ? <Play /> : <Pause />}
        </Button>
        <Button size="lg" onClick={finish}>
          Finish and mark done
        </Button>
      </div>
    </div>
  );
}
