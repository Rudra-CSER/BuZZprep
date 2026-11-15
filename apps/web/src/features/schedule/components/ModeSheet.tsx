import { addDays, MODE_META, SCHEDULE_MODES, type ScheduleMode } from '@buzzprep/shared';
import { useState } from 'react';
import { toast } from 'sonner';
import { errorMessage } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Segmented } from '@/components/ui/segmented';
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { useSetDayMode } from '../api';
import { MODE_ICONS } from './mode-icons';

/** Switch the day's mode. The routine itself is never edited — modes reshape it per day. */
export function ModeSheet({
  open,
  onOpenChange,
  date,
  current,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  date: string;
  current: ScheduleMode;
}) {
  const [mode, setMode] = useState<ScheduleMode>(current);
  const [span, setSpan] = useState<'1' | '2' | '3' | '7'>('1');
  const setDayMode = useSetDayMode();

  const apply = () => {
    const days = Number(span);
    setDayMode.mutate(
      { date, mode, until: days > 1 ? addDays(date, days - 1) : undefined },
      {
        onSuccess: () => {
          toast.success(
            mode === 'normal'
              ? 'Back to your normal schedule'
              : `${MODE_META[mode].label} mode is on`,
          );
          onOpenChange(false);
        },
        onError: (e) => toast.error(errorMessage(e)),
      },
    );
  };

  return (
    <Sheet
      open={open}
      onOpenChange={(v) => {
        if (v) setMode(current);
        onOpenChange(v);
      }}
    >
      <SheetContent>
        <SheetHeader>
          <SheetTitle>How is today going?</SheetTitle>
          <SheetDescription>Modes adjust the day without touching your routine.</SheetDescription>
        </SheetHeader>
        <SheetBody className="grid gap-4">
          <div role="radiogroup" aria-label="Schedule mode" className="grid gap-2">
            {SCHEDULE_MODES.map((m) => {
              const Icon = MODE_ICONS[m];
              const on = mode === m;
              return (
                <button
                  key={m}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => setMode(m)}
                  className={cn(
                    'flex items-start gap-3 rounded-[14px] border px-4 py-3.5 text-left transition-colors',
                    on ? 'border-primary bg-accent/60' : 'bg-card hover:bg-muted/60',
                  )}
                >
                  <Icon
                    className={cn(
                      'mt-0.5 size-5 shrink-0',
                      on ? 'text-primary' : 'text-muted-foreground',
                    )}
                  />
                  <span className="grid gap-0.5">
                    <span className="text-[15px] font-semibold">{MODE_META[m].label}</span>
                    <span className="text-[14px] text-muted-foreground">
                      {MODE_META[m].description}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
          <div className="grid gap-2">
            <p className="text-[14px] font-medium">Apply for</p>
            <Segmented
              ariaLabel="Apply for"
              value={span}
              onValueChange={setSpan}
              options={[
                { value: '1', label: 'Today' },
                { value: '2', label: '2 days' },
                { value: '3', label: '3 days' },
                { value: '7', label: 'A week' },
              ]}
              className="w-full"
            />
          </div>
        </SheetBody>
        <SheetFooter>
          <Button size="lg" className="flex-1" onClick={apply} disabled={setDayMode.isPending}>
            {mode === 'normal'
              ? 'Use normal schedule'
              : `Turn on ${MODE_META[mode].label.toLowerCase()}`}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
