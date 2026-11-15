import { DateTime } from 'luxon';
import type { DashboardResponse } from '@/api/types';
import { ListSection } from '@/components/ui/list-section';
import { hoursLabel } from '@/lib/format';
import { cn } from '@/lib/utils';

export function WeekSection({ data }: { data: DashboardResponse }) {
  const studyMinutes = data.week.days.reduce((s, d) => s + d.studyMinutes, 0);
  return (
    <ListSection title="Last 7 days">
      <div className="grid gap-4 px-4 py-4">
        <div className="flex items-end justify-between gap-2">
          {data.week.days.map((d) => {
            const ratio = d.planned > 0 ? d.done / d.planned : 0;
            const isToday = d.date === data.today;
            return (
              <div key={d.date} className="flex flex-1 flex-col items-center gap-1.5">
                <div
                  className="relative h-14 w-full max-w-7 overflow-hidden rounded-[7px] bg-muted"
                  title={`${d.done} of ${d.planned}`}
                >
                  <div
                    className={cn(
                      'absolute inset-x-0 bottom-0 rounded-[7px] transition-[height] duration-500',
                      ratio >= 1 ? 'bg-primary' : 'bg-primary/55',
                    )}
                    style={{ height: `${d.planned === 0 ? 0 : Math.max(8, ratio * 100)}%` }}
                  />
                </div>
                <span
                  className={cn(
                    'text-[11px] text-muted-foreground',
                    isToday && 'font-semibold text-foreground',
                  )}
                >
                  {DateTime.fromISO(d.date).toFormat('ccc').slice(0, 2)}
                </span>
              </div>
            );
          })}
        </div>
        <div className="flex justify-between text-[14px]">
          <span>
            <span className="font-semibold tabular">
              {data.week.percent ?? '—'}
              {data.week.percent !== null ? '%' : ''}
            </span>{' '}
            <span className="text-muted-foreground">of planned sessions</span>
          </span>
          <span>
            <span className="font-semibold tabular">{hoursLabel(studyMinutes)}</span>{' '}
            <span className="text-muted-foreground">studied</span>
          </span>
        </div>
      </div>
    </ListSection>
  );
}
