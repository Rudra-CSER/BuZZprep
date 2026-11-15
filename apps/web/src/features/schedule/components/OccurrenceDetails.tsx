import { CATEGORY_META, occurrenceTimeState, type Occurrence } from '@buzzprep/shared';
import { Check, CircleSlash, Pencil, Play, RotateCcw } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { toast } from 'sonner';
import { errorMessage } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { SheetBody, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import { useTimeContext } from '@/features/profile/hooks/useTimeContext';
import { occurrenceRange, relativeDay } from '@/lib/format';
import { catVar, cn } from '@/lib/utils';
import { useClearOverride, useUpdateOccurrence } from '../api';
import { MoveOptions } from './MoveOptions';
import { OccurrenceNotice } from './OccurrenceNotice';

/** Everything you can do with one occurrence. Also used full-page for notification deep links. */
export function OccurrenceDetails({
  occurrence: o,
  now,
  onDone,
  asPage,
}: {
  occurrence: Occurrence;
  now: number;
  onDone?: () => void;
  asPage?: boolean;
}) {
  const t = useTimeContext(now);
  const navigate = useNavigate();
  const update = useUpdateOccurrence();
  const clearOverride = useClearOverride();
  const [moving, setMoving] = useState(false);
  const [custom, setCustom] = useState({ date: o.displayDate, time: o.startTime });
  const [note, setNote] = useState(o.note ?? '');
  const [minutes, setMinutes] = useState(o.actualMinutes ?? o.durationMinutes);

  const state = occurrenceTimeState(o, now, t.graceMinutes);
  const trackable = CATEGORY_META[o.category].trackable;
  const done = o.status === 'completed';
  const skipped = o.status === 'skipped';
  const vars = { activityId: o.activityId, date: o.date };

  const setStatus = (
    status: 'completed' | 'skipped' | 'pending',
    extra: { actualMinutes?: number } = {},
  ) => {
    update.mutate(
      { ...vars, body: { status, ...extra } },
      { onError: (e) => toast.error(errorMessage(e)) },
    );
    if (status === 'completed') toast.success(`${o.title} marked done`);
    if (status === 'skipped') toast(`${o.title} skipped`);
    if (status !== 'pending') onDone?.();
  };

  const saveNote = () => {
    if ((o.note ?? '') === note) return;
    update.mutate({ ...vars, body: { note: note || null } });
  };

  const Title = asPage ? 'h2' : SheetTitle;
  const Description = asPage ? 'p' : SheetDescription;

  return (
    <>
      <SheetHeader className={cn(asPage && 'px-0 pt-0')}>
        <div
          className="mb-2 flex items-center gap-2 text-[13px] font-medium"
          style={catVar(o.category)}
        >
          <span className="size-2 rounded-full cat-dot" />
          <span className="cat-text">{CATEGORY_META[o.category].label}</span>
        </div>
        <Title className="text-[21px] font-semibold tracking-[-0.015em]">{o.title}</Title>
        <Description className="mt-1 text-[15px] text-muted-foreground">
          <span>{relativeDay(o.displayDate, t.today)}</span>
          <span className="mx-1.5 text-border">|</span>
          <span className="narrow tabular">{occurrenceRange(o, t.hour12)}</span>
        </Description>
      </SheetHeader>

      <SheetBody className={cn('grid gap-5', asPage && 'px-0')}>
        <OccurrenceNotice
          occurrence={o}
          state={state}
          today={t.today}
          onUndoMove={() =>
            clearOverride.mutate(vars, { onSuccess: () => toast('Back to the original time') })
          }
        />

        {o.description ? (
          <p className="text-[15px] leading-relaxed text-muted-foreground">{o.description}</p>
        ) : null}

        {/* Primary decisions */}
        {trackable && !done && !skipped && (
          <div className="grid grid-cols-2 gap-2">
            <Button
              size="lg"
              onClick={() => setStatus('completed', { actualMinutes: o.durationMinutes })}
            >
              <Check /> Mark done
            </Button>
            <Button size="lg" variant="outline" onClick={() => setStatus('skipped')}>
              <CircleSlash /> Skip
            </Button>
          </div>
        )}
        {trackable && (done || skipped) && (
          <div className="flex items-center justify-between gap-3 rounded-[12px] border px-3.5 py-3">
            <p className="text-[15px] font-medium">{done ? 'Done' : 'Skipped'}</p>
            <Button size="sm" variant="ghost" onClick={() => setStatus('pending')}>
              <RotateCcw /> {done ? 'Mark not done' : 'Undo skip'}
            </Button>
          </div>
        )}
        {done && (
          <Field label="Time actually spent" hint="Used for your weekly study hours.">
            {(id) => (
              <div className="flex items-center gap-2">
                <Input
                  id={id}
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={1440}
                  value={minutes}
                  onChange={(e) => setMinutes(Number(e.target.value))}
                  onBlur={() => update.mutate({ ...vars, body: { actualMinutes: minutes } })}
                  className="w-28"
                />
                <span className="text-[14px] text-muted-foreground">minutes</span>
              </div>
            )}
          </Field>
        )}

        {trackable && !done && (
          <MoveOptions
            occurrence={o}
            today={t.today}
            moving={moving}
            setMoving={setMoving}
            custom={custom}
            setCustom={setCustom}
            onDone={onDone}
          />
        )}

        <Field label="Notes">
          {(id) => (
            <Textarea
              id={id}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              onBlur={saveNote}
              placeholder="What you covered, what got in the way…"
              rows={3}
            />
          )}
        </Field>

        <div className="flex flex-wrap gap-2">
          {trackable && !done && (
            <Button variant="tinted" onClick={() => navigate(`/focus/${o.activityId}/${o.date}`)}>
              <Play /> Start focus session
            </Button>
          )}
          <Button asChild variant="ghost">
            <Link to={`/schedule/routine?edit=${o.activityId}`}>
              <Pencil /> Edit in routine
            </Link>
          </Button>
        </div>
      </SheetBody>
    </>
  );
}
