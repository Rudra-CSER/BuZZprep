import { REMINDER_KIND_META, REMINDER_KINDS, type ReminderKind } from '@buzzprep/shared';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Stepper } from '@/components/ui/stepper';
import { SwitchRow } from '@/components/ui/switch-row';
import type { Answers, Update } from '../types';

export function RemindersStep({ a, u }: { a: Answers; u: Update }) {
  const r = a.reminders;
  const kinds = (r.kinds ?? {}) as Partial<Record<ReminderKind, boolean>>;
  const set = (patch: Partial<Answers['reminders']>) => u({ reminders: { ...r, ...patch } });
  return (
    <>
      <div className="divide-y overflow-hidden rounded-[14px] border bg-card">
        {REMINDER_KINDS.filter((k) => k !== 'custom').map((k) => (
          <SwitchRow
            key={k}
            title={REMINDER_KIND_META[k].label}
            description={REMINDER_KIND_META[k].description}
            checked={kinds[k] !== false}
            onCheckedChange={(v) => set({ kinds: { ...kinds, [k]: v } })}
          />
        ))}
      </div>
      <div className="grid gap-2">
        <span className="text-[14px] font-medium">Heads-up before sessions</span>
        <Stepper
          label="minutes before"
          value={r.leadMinutes ?? 10}
          onChange={(v) => set({ leadMinutes: v })}
          min={0}
          max={60}
          step={5}
          format={(v) => (v ? `${v} min` : 'Off')}
        />
      </div>
      <div className="grid gap-3">
        <div className="overflow-hidden rounded-[14px] border bg-card">
          <SwitchRow
            title="Quiet hours"
            description="No reminders in this window, except your wake-up alarm."
            checked={r.quietHours.enabled}
            onCheckedChange={(v) => set({ quietHours: { ...r.quietHours, enabled: v } })}
          />
        </div>
        {r.quietHours.enabled && (
          <div className="grid grid-cols-2 gap-3">
            <Field label="From">
              {(id) => (
                <Input
                  id={id}
                  type="time"
                  value={r.quietHours.start}
                  onChange={(e) => set({ quietHours: { ...r.quietHours, start: e.target.value } })}
                />
              )}
            </Field>
            <Field label="Until">
              {(id) => (
                <Input
                  id={id}
                  type="time"
                  value={r.quietHours.end}
                  onChange={(e) => set({ quietHours: { ...r.quietHours, end: e.target.value } })}
                />
              )}
            </Field>
          </div>
        )}
      </div>
    </>
  );
}
