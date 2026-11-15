import { toast } from 'sonner';
import { errorMessage } from '@/api/client';
import type { Profile } from '@/api/types';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { ListSection } from '@/components/ui/list-section';
import { useUpdateProfile } from '../api';

/** Role and education; saved when a field loses focus. */
export function AboutYouSection({ profile }: { profile: Profile }) {
  const updateProfile = useUpdateProfile();

  const saveDetail = (section: 'professional' | 'education', key: string, value: string) => {
    const current = (profile[section] ?? {}) as Record<string, string | null>;
    if ((current[key] ?? '') === value) return;
    updateProfile.mutate({ [section]: { ...current, [key]: value || null } } as Partial<Profile>, {
      onSuccess: () => toast('Saved'),
      onError: (e) => toast.error(errorMessage(e)),
    });
  };

  return (
    <ListSection
      title="About you"
      footer="Private to you. Used for context in your plan, never shown to anyone else."
    >
      <div className="grid gap-4 px-4 py-4 sm:grid-cols-2">
        <Field label="Role">
          {(id) => (
            <Input
              id={id}
              defaultValue={profile.professional?.designation ?? ''}
              onBlur={(e) => saveDetail('professional', 'designation', e.target.value)}
              placeholder="e.g. Software engineer"
            />
          )}
        </Field>
        <Field label="Organisation">
          {(id) => (
            <Input
              id={id}
              defaultValue={profile.professional?.organization ?? ''}
              onBlur={(e) => saveDetail('professional', 'organization', e.target.value)}
            />
          )}
        </Field>
        <Field label="Degree">
          {(id) => (
            <Input
              id={id}
              defaultValue={profile.education?.degree ?? ''}
              onBlur={(e) => saveDetail('education', 'degree', e.target.value)}
              placeholder="e.g. B.Tech"
            />
          )}
        </Field>
        <Field label="Field of study">
          {(id) => (
            <Input
              id={id}
              defaultValue={profile.education?.field ?? ''}
              onBlur={(e) => saveDetail('education', 'field', e.target.value)}
            />
          )}
        </Field>
        <Field label="Grade">
          {(id) => (
            <Input
              id={id}
              defaultValue={profile.education?.grade ?? ''}
              onBlur={(e) => saveDetail('education', 'grade', e.target.value)}
              placeholder="e.g. CGPA"
            />
          )}
        </Field>
      </div>
    </ListSection>
  );
}
