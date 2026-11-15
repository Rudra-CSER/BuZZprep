import { CATEGORY_META, PRIORITIES } from '@buzzprep/shared';
import { Trash2 } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { errorMessage, fieldErrors } from '@/api/client';
import type { Activity } from '@/api/types';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Segmented } from '@/components/ui/segmented';
import { SheetBody, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { SwitchRow } from '@/components/ui/switch-row';
import { Textarea } from '@/components/ui/textarea';
import { fromActivity, toActivityInput, type FormState, type SetField } from '../activity-form';
import { archiveActivity, createActivity, invalidateRoutine, updateActivity } from '../api';
import { ActivityReminderFields } from './ActivityReminderFields';
import { ActivityTimeFields } from './ActivityTimeFields';
import { CategoryPicker } from './CategoryPicker';
import { RepeatFields } from './RepeatFields';

export function ActivityForm({
  activity,
  today,
  onClose,
}: {
  activity: Activity | null;
  today: string;
  onClose: () => void;
}) {
  const [f, setF] = useState<FormState>(() => fromActivity(activity, today));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const set: SetField = (k, v) => setF((s) => ({ ...s, [k]: v }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (f.repeat === 'days' && f.days.length === 0) {
      setErrors({ recurrence: 'Pick at least one day' });
      return;
    }
    setBusy(true);
    setErrors({});
    const body = toActivityInput(f);
    try {
      if (activity) await updateActivity(activity.id, body);
      else await createActivity(body);
      await invalidateRoutine();
      toast.success(activity ? 'Activity updated' : 'Activity added');
      onClose();
    } catch (err) {
      setErrors(fieldErrors(err));
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (
      !activity ||
      !window.confirm(`Remove “${activity.title}” from your routine? Past check-ins are kept.`)
    )
      return;
    try {
      await archiveActivity(activity.id);
      await invalidateRoutine();
      toast('Activity removed');
      onClose();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  return (
    <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
      <SheetHeader>
        <SheetTitle>{activity ? 'Edit activity' : 'New activity'}</SheetTitle>
      </SheetHeader>
      <SheetBody className="grid gap-5">
        <Field label="Title" error={errors.title}>
          {(id) => (
            <Input
              id={id}
              value={f.title}
              onChange={(e) => set('title', e.target.value)}
              placeholder="e.g. DSA practice"
              required
              maxLength={120}
            />
          )}
        </Field>

        <CategoryPicker
          value={f.category}
          onChange={(c) =>
            setF((s) => ({ ...s, category: c, blocking: CATEGORY_META[c].defaultBlocking }))
          }
        />

        <ActivityTimeFields f={f} set={set} />

        <RepeatFields f={f} set={set} error={errors.recurrence} />

        <div className="grid gap-2">
          <span className="text-[14px] font-medium">Priority</span>
          <Segmented
            ariaLabel="Priority"
            value={f.priority}
            onValueChange={(v) => set('priority', v)}
            options={PRIORITIES.map((p) => ({ value: p, label: p[0]!.toUpperCase() + p.slice(1) }))}
            className="w-full"
          />
        </div>

        <div className="divide-y overflow-hidden rounded-[14px] border">
          <SwitchRow
            title="Essential"
            description="Never shortened or paused by modes."
            checked={f.essential}
            onCheckedChange={(v) => set('essential', v)}
          />
          <SwitchRow
            title="Keep this time free"
            description="Missed sessions won’t be moved into it."
            checked={f.blocking}
            onCheckedChange={(v) => set('blocking', v)}
          />
        </div>

        <ActivityReminderFields f={f} set={set} />

        <Field label="Description" hint="Shown in the session details and focus view.">
          {(id) => (
            <Textarea
              id={id}
              value={f.description}
              onChange={(e) => set('description', e.target.value)}
              rows={2}
              maxLength={2000}
            />
          )}
        </Field>
      </SheetBody>
      <SheetFooter>
        {activity && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => void remove()}
            aria-label="Remove activity"
            className="text-destructive"
          >
            <Trash2 />
          </Button>
        )}
        <Button type="submit" size="lg" className="flex-1" disabled={busy || !f.title.trim()}>
          {busy ? 'Saving…' : activity ? 'Save changes' : 'Add to routine'}
        </Button>
      </SheetFooter>
    </form>
  );
}
