import { THEME_PREFERENCES, type ThemePreference } from '@buzzprep/shared';
import { ListSection } from '@/components/ui/list-section';
import { Segmented } from '@/components/ui/segmented';
import { useTheme } from '@/lib/theme';
import { useUpdateProfile } from '../api';

/** Light, dark or system theme; saved to the profile so other devices follow. */
export function AppearanceSection() {
  const { pref, setPref } = useTheme();
  const updateProfile = useUpdateProfile();
  return (
    <ListSection title="Appearance">
      <div className="px-4 py-3">
        <Segmented
          ariaLabel="Theme"
          value={pref}
          onValueChange={(v: ThemePreference) => {
            setPref(v);
            updateProfile.mutate({ theme: v });
          }}
          options={THEME_PREFERENCES.map((t) => ({
            value: t,
            label: t[0]!.toUpperCase() + t.slice(1),
          }))}
          className="w-full"
        />
      </div>
    </ListSection>
  );
}
