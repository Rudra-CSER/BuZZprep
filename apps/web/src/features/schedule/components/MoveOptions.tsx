import type { LocalDate, Occurrence, SlotSuggestion } from '@buzzprep/shared';
import { CalendarClock, Sparkles } from 'lucide-react';
import type { Dispatch, SetStateAction } from 'react';
import { toast } from 'sonner';
import { errorMessage } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { relativeDay } from '@/lib/format';
import { usePostpone, useReschedule, useSuggestions } from '../api';

/** Postpone by a few minutes, take a suggested free slot, or pick any date and time. */
export function MoveOptions({
  occurrence: o,
  today,
  moving,
  setMoving,
  custom,
  setCustom,
  onDone,
}: {
  occurrence: Occurrence;
  today: LocalDate;
  moving: boolean;
  setMoving: Dispatch<SetStateAction<boolean>>;
  custom: { date: string; time: string };
  setCustom: Dispatch<SetStateAction<{ date: string; time: string }>>;
  onDone?: () => void;
}) {
  const postpone = usePostpone();
  const reschedule = useReschedule();
  const suggestions = useSuggestions(o.activityId, o.date, moving);
  const vars = { activityId: o.activityId, date: o.date };

  const moveTo = async (target: { date: string; startTime: string }, label: string) => {
    try {
      const res = await reschedule.mutateAsync({ ...vars, target });
      if (res.conflicts.length > 0) {
        toast.warning(
          `Moved to ${label} — overlaps ${res.conflicts.map((c) => c.title).join(', ')}`,
        );
      } else {
        toast.success(`Moved to ${label}`);
      }
      setMoving(false);
      onDone?.();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  return (
    <section className="grid gap-3">
      <h3 className="text-[15px] font-semibold">Move it</h3>
      <div className="flex flex-wrap gap-2">
        {[15, 30, 60].map((m) => (
          <Button
            key={m}
            size="sm"
            variant="secondary"
            disabled={postpone.isPending}
            onClick={() =>
              postpone.mutate(
                { ...vars, minutes: m },
                {
                  onSuccess: () => {
                    toast.success(`Postponed ${m < 60 ? `${m} min` : '1 hour'}`);
                    onDone?.();
                  },
                  onError: (e) => toast.error(errorMessage(e)),
                },
              )
            }
          >
            +{m < 60 ? `${m} min` : '1 hour'}
          </Button>
        ))}
        <Button
          size="sm"
          variant={moving ? 'tinted' : 'secondary'}
          onClick={() => setMoving((v) => !v)}
        >
          <Sparkles /> Find a free slot
        </Button>
      </div>

      {moving && (
        <div className="grid gap-2">
          {suggestions.isPending ? (
            <p className="text-[14px] text-muted-foreground">
              Looking for free time around sleep, work and your other sessions…
            </p>
          ) : suggestions.isError ? (
            <p className="text-[14px] text-destructive">{errorMessage(suggestions.error)}</p>
          ) : (suggestions.data?.suggestions.length ?? 0) === 0 ? (
            <p className="text-[14px] text-muted-foreground">
              No free slot of {o.durationMinutes} minutes in the next three days. Pick a time below.
            </p>
          ) : (
            <ul className="grid gap-2">
              {suggestions.data!.suggestions.map((s: SlotSuggestion) => (
                <li key={s.start}>
                  <button
                    type="button"
                    onClick={() => void moveTo({ date: s.date, startTime: s.startTime }, s.label)}
                    className="flex w-full items-center justify-between rounded-[12px] border bg-card px-3.5 py-3 text-left hover:border-primary"
                  >
                    <span className="text-[15px] font-medium">{s.label}</span>
                    <span className="text-[13px] text-muted-foreground">
                      {s.reason === 'same_time'
                        ? 'Usual time'
                        : s.reason === 'earliest'
                          ? 'Soonest'
                          : 'Free'}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-1 grid grid-cols-[1fr_auto_auto] items-end gap-2">
            <Field label="Or pick a time">
              {(id) => (
                <Input
                  id={id}
                  type="date"
                  value={custom.date}
                  onChange={(e) => setCustom((c) => ({ ...c, date: e.target.value }))}
                />
              )}
            </Field>
            <Input
              type="time"
              aria-label="Start time"
              value={custom.time}
              onChange={(e) => setCustom((c) => ({ ...c, time: e.target.value }))}
              className="w-32"
            />
            <Button
              variant="tinted"
              disabled={reschedule.isPending || !custom.date || !custom.time}
              onClick={() =>
                void moveTo(
                  { date: custom.date, startTime: custom.time },
                  `${relativeDay(custom.date, today)} ${custom.time}`,
                )
              }
            >
              <CalendarClock /> Move
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
