import {
  addDays,
  expandAgenda,
  formatTimeLabel,
  generateBundle,
  isoWeekday,
  onboardingAnswersSchema,
  summarizeWeek,
  type Weekday,
} from '@buzzprep/shared';
import { useMemo, useState } from 'react';
import { Segmented } from '@/components/ui/segmented';
import { formatDuration, hoursLabel } from '@/lib/format';
import { catVar } from '@/lib/utils';
import type { Answers } from '../types';

export function ReviewStep({ a }: { a: Answers }) {
  const [tab, setTab] = useState<'weekday' | 'weekend'>('weekday');
  const parsed = useMemo(() => onboardingAnswersSchema.safeParse(a), [a]);
  const preview = useMemo(() => {
    if (!parsed.success) return null;
    const bundle = generateBundle(parsed.data);
    const ctx = { zone: parsed.data.timezone, dayBoundaryMinutes: 240 };
    const activities = bundle.schedule!.activities.map((x) => ({
      ...x,
      id: x.ref,
      blocking: x.blocking ?? true,
    }));
    // Preview the routine after any gradual sleep shift has settled.
    const base = addDays(parsed.data.startDate, 35);
    const find = (pred: (d: Weekday) => boolean) => {
      for (let i = 0; i < 7; i++) if (pred(isoWeekday(addDays(base, i)))) return addDays(base, i);
      return base;
    };
    const workday = find((d) =>
      parsed.data.work.enabled ? parsed.data.work.days.includes(d) : d <= 5,
    );
    const offday = find(
      (d) => !(parsed.data.work.enabled ? parsed.data.work.days.includes(d) : d <= 5),
    );
    const day = (date: string) => expandAgenda({ activities, from: date, to: date, ctx });
    return { bundle, week: summarizeWeek(bundle), workday: day(workday), offday: day(offday) };
  }, [parsed]);

  if (!parsed.success || !preview) {
    return (
      <ul className="grid gap-1 rounded-[12px] bg-muted p-4 text-[14px] text-destructive">
        {(parsed.error?.issues ?? []).slice(0, 6).map((i) => (
          <li key={i.path.join('.')}>
            {i.path.join(' › ')}: {i.message}
          </li>
        ))}
      </ul>
    );
  }
  const list = tab === 'weekday' ? preview.workday : preview.offday;
  return (
    <>
      <dl className="grid grid-cols-3 gap-2">
        {[
          { label: 'study per week', value: hoursLabel(preview.week.studyMinutes) },
          { label: 'sessions', value: String(preview.week.studySessions) },
          { label: 'reminders a day', value: `~${Math.round(preview.week.remindersPerDay)}` },
        ].map((s) => (
          <div
            key={s.label}
            className="flex flex-col-reverse rounded-[12px] border bg-card px-3 py-2.5"
          >
            <dt className="text-[12px] leading-tight text-muted-foreground">{s.label}</dt>
            <dd className="text-[19px] font-semibold tabular">{s.value}</dd>
          </div>
        ))}
      </dl>
      <Segmented
        ariaLabel="Preview day"
        value={tab}
        onValueChange={setTab}
        options={[
          { value: 'weekday', label: a.work.enabled ? 'Working day' : 'Weekday' },
          { value: 'weekend', label: 'Other days' },
        ]}
        className="w-full"
      />
      <ul className="divide-y overflow-hidden rounded-[14px] border bg-card">
        {list.map((o) => (
          <li
            key={o.key}
            style={catVar(o.category)}
            className="flex items-center gap-3 px-4 py-2.5"
          >
            <span className="w-[4.6rem] shrink-0 text-[13px] text-muted-foreground narrow tabular">
              {formatTimeLabel(o.startTime)}
            </span>
            <span className="size-2 shrink-0 rounded-full cat-dot" />
            <span className="min-w-0 flex-1 truncate text-[15px]">{o.title}</span>
            <span className="shrink-0 text-[13px] text-muted-foreground">
              {o.durationMinutes ? formatDuration(o.durationMinutes) : ''}
            </span>
          </li>
        ))}
      </ul>
      <p className="text-[14px] text-muted-foreground">
        {preview.bundle.tracks.length} learning{' '}
        {preview.bundle.tracks.length === 1 ? 'track' : 'tracks'},{' '}
        {preview.bundle.plan?.milestones.length ?? 0} milestones and {preview.bundle.habits.length}{' '}
        habits are created too.
      </p>
    </>
  );
}
