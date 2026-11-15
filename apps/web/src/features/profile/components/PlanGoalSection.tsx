import type { Plan } from '@/api/types';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { ListSection } from '@/components/ui/list-section';
import { TagInput } from '@/components/ui/tag-input';

/** The goal, dates and target companies; each field saves on its own. */
export function PlanGoalSection({
  plan,
  onPatch,
}: {
  plan: Plan;
  onPatch: (patch: Partial<Plan>) => void;
}) {
  return (
    <ListSection title="Goal">
      <div className="grid gap-4 px-4 py-4">
        <Field label="Goal">
          {(id) => (
            <Input
              id={id}
              defaultValue={plan.title}
              onBlur={(e) =>
                e.target.value.trim() &&
                e.target.value !== plan.title &&
                onPatch({ title: e.target.value.trim() })
              }
            />
          )}
        </Field>
        <Field label="Target role">
          {(id) => (
            <Input
              id={id}
              defaultValue={plan.targetRole ?? ''}
              onBlur={(e) =>
                e.target.value !== (plan.targetRole ?? '') &&
                onPatch({ targetRole: e.target.value || null })
              }
            />
          )}
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Start">
            {(id) => (
              <Input
                id={id}
                type="date"
                defaultValue={plan.startDate}
                onBlur={(e) =>
                  e.target.value &&
                  e.target.value !== plan.startDate &&
                  onPatch({ startDate: e.target.value })
                }
              />
            )}
          </Field>
          <Field label="Ready by">
            {(id) => (
              <Input
                id={id}
                type="date"
                defaultValue={plan.deadline}
                onBlur={(e) =>
                  e.target.value &&
                  e.target.value !== plan.deadline &&
                  onPatch({ deadline: e.target.value })
                }
              />
            )}
          </Field>
        </div>
        <Field label="Target companies">
          {(id) => (
            <TagInput
              id={id}
              value={plan.targetCompanies}
              onChange={(v) => onPatch({ targetCompanies: v })}
              placeholder="Add a company"
            />
          )}
        </Field>
        <Field label="Stretch companies">
          {(id) => (
            <TagInput
              id={id}
              value={plan.stretchCompanies}
              onChange={(v) => onPatch({ stretchCompanies: v })}
              placeholder="Add a company"
            />
          )}
        </Field>
        <Field label="Compensation target">
          {(id) => (
            <Input
              id={id}
              defaultValue={plan.compensationTarget ?? ''}
              onBlur={(e) =>
                e.target.value !== (plan.compensationTarget ?? '') &&
                onPatch({ compensationTarget: e.target.value || null })
              }
            />
          )}
        </Field>
      </div>
    </ListSection>
  );
}
