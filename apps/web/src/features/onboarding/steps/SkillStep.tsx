import { SKILL_LEVELS, type SkillLevel } from '@buzzprep/shared';
import { Field } from '@/components/ui/field';
import { Segmented } from '@/components/ui/segmented';
import { Textarea } from '@/components/ui/textarea';
import type { Answers, Update } from '../types';

export function SkillStep({ a, u }: { a: Answers; u: Update }) {
  const levels = (a.skills?.levels ?? {}) as Record<string, SkillLevel>;
  return (
    <>
      {a.tracks.map((t) => (
        <div key={t.ref} className="grid gap-2">
          <span className="text-[15px] font-medium">{t.title}</span>
          <Segmented
            ariaLabel={`${t.title} level`}
            value={levels[t.ref] ?? 'beginner'}
            onValueChange={(v) => u({ skills: { ...a.skills, levels: { ...levels, [t.ref]: v } } })}
            options={SKILL_LEVELS.map((l) => ({
              value: l,
              label: l[0]!.toUpperCase() + l.slice(1),
            }))}
            className="w-full"
          />
        </div>
      ))}
      <Field
        label="Anything to note?"
        hint="e.g. “I struggle with Easy problems” — a reminder to future you."
      >
        {(id) => (
          <Textarea
            id={id}
            value={a.skills?.notes ?? ''}
            onChange={(e) => u({ skills: { levels, notes: e.target.value || null } })}
            rows={3}
            maxLength={2000}
          />
        )}
      </Field>
    </>
  );
}
