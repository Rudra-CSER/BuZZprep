import type { Weekday } from '@buzzprep/shared';
import { Segmented } from '@/components/ui/segmented';
import { Stepper } from '@/components/ui/stepper';
import { formatDuration, hoursLabel } from '@/lib/format';
import type { Answers, Update } from '../types';

const minutesLabel = (m: number) => (m === 0 ? 'None' : formatDuration(m));

export function StudyStep({ a, u }: { a: Answers; u: Update }) {
  const st = a.study;
  const set = (patch: Partial<Answers['study']>) => u({ study: { ...st, ...patch } });
  const weekdays = a.work.enabled
    ? a.work.days.filter((d) => !a.restDays.includes(d as Weekday)).length
    : 5;
  const weekendDays = 7 - weekdays - a.restDays.length;
  const weekly =
    weekdays * (st.weekdayMinutes + (st.morningRevisionMinutes ?? 0)) +
    Math.max(0, weekendDays) * st.weekendMinutes;
  return (
    <>
      <div className="grid gap-2">
        <span className="text-[14px] font-medium">
          On {a.work.enabled ? 'working days' : 'weekdays'}
        </span>
        <Stepper
          label="weekday study time"
          value={st.weekdayMinutes}
          onChange={(v) => set({ weekdayMinutes: v })}
          min={0}
          max={480}
          step={15}
          format={minutesLabel}
        />
        <p className="text-[13px] text-muted-foreground">
          Split into a main session and a second, shorter one with a break in between.
        </p>
      </div>
      <div className="grid gap-2">
        <span className="text-[14px] font-medium">Light morning revision</span>
        <Stepper
          label="morning revision"
          value={st.morningRevisionMinutes ?? 0}
          onChange={(v) => set({ morningRevisionMinutes: v })}
          min={0}
          max={90}
          step={5}
          format={minutesLabel}
        />
        <p className="text-[13px] text-muted-foreground">
          Spaced-revision of earlier problems before {a.work.enabled ? 'work' : 'your day'} starts.
        </p>
      </div>
      <div className="grid gap-2">
        <span className="text-[14px] font-medium">On other days (not rest days)</span>
        <Stepper
          label="weekend study time"
          value={st.weekendMinutes}
          onChange={(v) => set({ weekendMinutes: v })}
          min={0}
          max={300}
          step={15}
          format={minutesLabel}
        />
      </div>
      {!a.work.enabled && (
        <div className="grid gap-2">
          <span className="text-[14px] font-medium">You focus best</span>
          <Segmented
            ariaLabel="Preferred study time"
            value={st.preferredWindow ?? 'evening'}
            onValueChange={(v) => set({ preferredWindow: v })}
            options={[
              { value: 'morning', label: 'In the morning' },
              { value: 'evening', label: 'In the evening' },
            ]}
            className="w-full"
          />
        </div>
      )}
      <p className="rounded-[12px] bg-muted px-4 py-3 text-[15px]">
        About <strong className="font-semibold tabular">{hoursLabel(weekly)}</strong> of preparation
        a week.
      </p>
    </>
  );
}
