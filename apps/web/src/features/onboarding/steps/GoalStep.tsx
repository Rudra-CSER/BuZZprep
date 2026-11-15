import { defaultAnswers, TEMPLATES, type TemplateKey } from '@buzzprep/shared';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { TagInput } from '@/components/ui/tag-input';
import { cn } from '@/lib/utils';
import type { Answers, Update } from '../types';

export function GoalStep({ a, u }: { a: Answers; u: Update }) {
  const pick = (key: TemplateKey) => {
    if (key === a.templateKey) return;
    const next = defaultAnswers(key, { timezone: a.timezone, today: a.startDate });
    u({
      ...next,
      startDate: a.startDate,
      goal: {
        ...next.goal,
        targetCompanies: a.goal.targetCompanies,
        stretchCompanies: a.goal.stretchCompanies,
      },
    });
  };
  return (
    <>
      <div role="radiogroup" aria-label="Plan template" className="grid gap-2 sm:grid-cols-2">
        {TEMPLATES.map((t) => (
          <button
            key={t.key}
            type="button"
            role="radio"
            aria-checked={a.templateKey === t.key}
            onClick={() => pick(t.key)}
            className={cn(
              'grid gap-1 rounded-[14px] border px-4 py-3 text-left transition-colors',
              a.templateKey === t.key ? 'border-primary bg-accent/60' : 'bg-card hover:bg-muted/60',
            )}
          >
            <span className="text-[15px] font-semibold">{t.title}</span>
            <span className="text-[13px] leading-snug text-muted-foreground">{t.tagline}</span>
          </button>
        ))}
      </div>
      <Field label="Your goal">
        {(id) => (
          <Input
            id={id}
            value={a.goal.title}
            onChange={(e) => u({ goal: { ...a.goal, title: e.target.value } })}
            maxLength={120}
          />
        )}
      </Field>
      <Field label="Target role" hint="Optional.">
        {(id) => (
          <Input
            id={id}
            value={a.goal.targetRole ?? ''}
            onChange={(e) => u({ goal: { ...a.goal, targetRole: e.target.value || null } })}
            placeholder="e.g. SDE-1"
          />
        )}
      </Field>
      <Field
        label="Target companies"
        hint="Press Enter after each. They become your application tracker."
      >
        {(id) => (
          <TagInput
            id={id}
            value={a.goal.targetCompanies ?? []}
            onChange={(v) => u({ goal: { ...a.goal, targetCompanies: v } })}
            placeholder="Add a company"
          />
        )}
      </Field>
      <Field label="Stretch companies" hint="Optional. The ones you’re reaching for.">
        {(id) => (
          <TagInput
            id={id}
            value={a.goal.stretchCompanies ?? []}
            onChange={(v) => u({ goal: { ...a.goal, stretchCompanies: v } })}
            placeholder="Add a company"
          />
        )}
      </Field>
      <Field label="Compensation target" hint="Optional.">
        {(id) => (
          <Input
            id={id}
            value={a.goal.compensationTarget ?? ''}
            onChange={(e) => u({ goal: { ...a.goal, compensationTarget: e.target.value || null } })}
            placeholder="e.g. 20 LPA"
          />
        )}
      </Field>
    </>
  );
}
