import type { Profile } from '@/api/types';
import { Field } from '@/components/ui/field';
import { ListSection } from '@/components/ui/list-section';
import { NativeSelect } from '@/components/ui/native-select';
import { useUpdateProfile } from '../api';

/** Time zone and the hour the day rolls over. */
export function TimeSection({ profile }: { profile: Profile }) {
  const updateProfile = useUpdateProfile();
  return (
    <ListSection title="Time" footer="A day starting at 4 AM keeps a 1 AM bedtime in “today”.">
      <div className="grid gap-4 px-4 py-4 sm:grid-cols-2">
        <Field label="Time zone">
          {(id) => (
            <NativeSelect
              id={id}
              value={profile.timezone}
              onChange={(e) => updateProfile.mutate({ timezone: e.target.value })}
            >
              {timeZones(profile.timezone).map((z) => (
                <option key={z} value={z}>
                  {z.replace(/_/g, ' ')}
                </option>
              ))}
            </NativeSelect>
          )}
        </Field>
        <Field label="Day starts at">
          {(id) => (
            <NativeSelect
              id={id}
              value={String(profile.dayBoundaryMinutes)}
              onChange={(e) => updateProfile.mutate({ dayBoundaryMinutes: Number(e.target.value) })}
            >
              {[0, 2, 3, 4, 5, 6].map((h) => (
                <option key={h} value={h * 60}>
                  {h === 0 ? 'Midnight' : `${h}:00 AM`}
                </option>
              ))}
            </NativeSelect>
          )}
        </Field>
      </div>
    </ListSection>
  );
}

function timeZones(current: string): string[] {
  try {
    const all = (Intl as unknown as { supportedValuesOf(k: string): string[] }).supportedValuesOf(
      'timeZone',
    );
    return all.includes(current) ? all : [current, ...all];
  } catch {
    return [current];
  }
}
