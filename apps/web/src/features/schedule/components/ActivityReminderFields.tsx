import { CATEGORY_META } from '@buzzprep/shared';
import { SwitchRow } from '@/components/ui/switch-row';
import type { FormState, SetField } from '../activity-form';

/** The before, at-start and not-marked-done reminders for one activity. */
export function ActivityReminderFields({ f, set }: { f: FormState; set: SetField }) {
  const trackable = CATEGORY_META[f.category].trackable;

  return (
    <div className="grid gap-2">
      <span className="text-[14px] font-medium">Reminders</span>
      <div className="divide-y overflow-hidden rounded-[14px] border">
        <SwitchRow
          title={
            <span className="inline-flex items-center gap-2">
              Before it starts
              {f.upcoming && (
                <select
                  value={f.upcomingMinutes}
                  onChange={(e) => set('upcomingMinutes', Number(e.target.value))}
                  className="rounded-[8px] border bg-card px-2 py-1 text-[14px]"
                  aria-label="Minutes before"
                >
                  {[5, 10, 15, 30, 60].map((m) => (
                    <option key={m} value={m}>
                      {m} min
                    </option>
                  ))}
                </select>
              )}
            </span>
          }
          checked={f.upcoming}
          onCheckedChange={(v) => set('upcoming', v)}
        />
        <SwitchRow
          title="When it starts"
          checked={f.atStart}
          onCheckedChange={(v) => set('atStart', v)}
        />
        {trackable && (
          <SwitchRow
            title="If it isn’t marked done"
            description={`${f.overdueMinutes} minutes after it ends.`}
            checked={f.overdue}
            onCheckedChange={(v) => set('overdue', v)}
          />
        )}
      </div>
    </div>
  );
}
