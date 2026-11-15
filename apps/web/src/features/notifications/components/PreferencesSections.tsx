import {
  ACTIVITY_CATEGORIES,
  CATEGORY_META,
  REMINDER_KIND_META,
  REMINDER_KINDS,
  type NotificationPreferences,
  type ReminderKind,
} from '@buzzprep/shared';
import { ChipGroup } from '@/components/ui/chip-group';
import { Input } from '@/components/ui/input';
import { ListSection } from '@/components/ui/list-section';
import { NativeSelect } from '@/components/ui/native-select';
import { SwitchRow } from '@/components/ui/switch-row';

/** Account-wide notification preferences: kinds, quiet hours, snooze, clock, muted categories. */
export function PreferencesSections({
  prefs,
  setPrefs,
}: {
  prefs: NotificationPreferences;
  setPrefs: (patch: Partial<NotificationPreferences>) => void;
}) {
  return (
    <>
      <ListSection
        title="What can notify you"
        footer="Applies to every device. Individual reminders are edited on each activity."
      >
        <SwitchRow
          title="All reminders"
          checked={prefs.enabled}
          onCheckedChange={(v) => setPrefs({ enabled: v })}
        />
        {REMINDER_KINDS.filter((k) => k !== 'custom').map((k: ReminderKind) => (
          <SwitchRow
            key={k}
            title={REMINDER_KIND_META[k].label}
            description={REMINDER_KIND_META[k].description}
            checked={prefs.kinds[k] !== false}
            disabled={!prefs.enabled}
            onCheckedChange={(v) => setPrefs({ kinds: { ...prefs.kinds, [k]: v } })}
          />
        ))}
      </ListSection>

      <ListSection
        title="Quiet hours"
        footer="Your wake-up alarm still rings. Other reminders in this window are held back."
      >
        <SwitchRow
          title="Quiet hours"
          checked={prefs.quietHours.enabled}
          onCheckedChange={(v) => setPrefs({ quietHours: { ...prefs.quietHours, enabled: v } })}
        />
        {prefs.quietHours.enabled && (
          <div className="grid grid-cols-2 gap-3 px-4 py-3">
            <label className="grid gap-1.5 text-[14px] font-medium">
              From
              <Input
                type="time"
                value={prefs.quietHours.start}
                onChange={(e) =>
                  setPrefs({ quietHours: { ...prefs.quietHours, start: e.target.value } })
                }
              />
            </label>
            <label className="grid gap-1.5 text-[14px] font-medium">
              Until
              <Input
                type="time"
                value={prefs.quietHours.end}
                onChange={(e) =>
                  setPrefs({ quietHours: { ...prefs.quietHours, end: e.target.value } })
                }
              />
            </label>
          </div>
        )}
      </ListSection>

      <ListSection title="Details">
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <span className="text-[15px]">Snooze length</span>
          <NativeSelect
            value={String(prefs.defaultSnoozeMinutes)}
            onChange={(e) => setPrefs({ defaultSnoozeMinutes: Number(e.target.value) })}
            aria-label="Snooze length"
            className="w-32"
          >
            {[5, 10, 15, 30, 60].map((m) => (
              <option key={m} value={m}>
                {m} min
              </option>
            ))}
          </NativeSelect>
        </div>
        <SwitchRow
          title="12-hour clock"
          checked={prefs.hour12}
          onCheckedChange={(v) => setPrefs({ hour12: v })}
        />
        <div className="grid gap-2 px-4 py-3">
          <span className="text-[15px]">Mute reminders for</span>
          <ChipGroup
            ariaLabel="Muted categories"
            options={ACTIVITY_CATEGORIES.map((c) => ({
              value: c,
              label: CATEGORY_META[c].label,
            }))}
            value={prefs.mutedCategories}
            onChange={(v) => setPrefs({ mutedCategories: v })}
          />
        </div>
      </ListSection>
    </>
  );
}
