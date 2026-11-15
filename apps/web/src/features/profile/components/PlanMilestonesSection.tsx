import type { LocalDate } from '@buzzprep/shared';
import { Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import type { Plan } from '@/api/types';
import { Button } from '@/components/ui/button';
import { CompleteCircle } from '@/components/ui/complete-circle';
import { Input } from '@/components/ui/input';
import { ListSection } from '@/components/ui/list-section';
import { relativeDay } from '@/lib/format';
import { cn } from '@/lib/utils';
import { addMilestone, deleteMilestone, updateMilestone } from '../api';
import { usePlanAction } from '../hooks/usePlanAction';

/** Milestones in date order: tick off, delete or add. */
export function PlanMilestonesSection({ plan, today }: { plan: Plan; today: LocalDate }) {
  const run = usePlanAction();
  const [newTitle, setNewTitle] = useState('');
  const [newDate, setNewDate] = useState('');
  const milestones = [...plan.milestones].sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  return (
    <ListSection
      title="Milestones"
      footer="You’ll get a reminder a week and a day before each one."
    >
      {milestones.map((m) => (
        <div key={m.id} className="flex items-start gap-3 px-4 py-3">
          <div className="pt-0.5">
            <CompleteCircle
              checked={m.completed}
              label={m.completed ? `Mark “${m.title}” as not done` : `Mark “${m.title}” as done`}
              onToggle={() =>
                void run(() => updateMilestone(plan.id, m.id, { completed: !m.completed }))
              }
            />
          </div>
          <span className="min-w-0 flex-1">
            <span
              className={cn(
                'block text-[15px] leading-snug',
                m.completed && 'text-muted-foreground line-through decoration-muted-foreground/50',
              )}
            >
              {m.title}
            </span>
            <span className="text-[13px] text-muted-foreground">
              {relativeDay(m.dueDate, today)}
            </span>
          </span>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Delete “${m.title}”`}
            onClick={() => void run(() => deleteMilestone(plan.id, m.id))}
          >
            <Trash2 />
          </Button>
        </div>
      ))}
      <form
        className="grid grid-cols-[1fr_auto] gap-2 px-4 py-3 sm:grid-cols-[1fr_10rem_auto]"
        onSubmit={(e) => {
          e.preventDefault();
          if (!newTitle.trim() || !newDate) return;
          void run(
            () => addMilestone(plan.id, { title: newTitle.trim(), dueDate: newDate }),
            'Milestone added',
          ).then(() => {
            setNewTitle('');
            setNewDate('');
          });
        }}
      >
        <Input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="New milestone"
          aria-label="Milestone"
          className="col-span-2 sm:col-span-1"
        />
        <Input
          type="date"
          value={newDate}
          onChange={(e) => setNewDate(e.target.value)}
          aria-label="Due date"
        />
        <Button type="submit" variant="tinted" disabled={!newTitle.trim() || !newDate}>
          <Plus /> Add
        </Button>
      </form>
    </ListSection>
  );
}
