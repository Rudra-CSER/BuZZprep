import { Copy, MoreHorizontal, RotateCcw, Star, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { errorMessage } from '@/api/client';
import type { ScheduleTemplate } from '@/api/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ListSection } from '@/components/ui/list-section';
import { pluralize } from '@/lib/utils';
import {
  activateSchedule,
  deleteSchedule,
  duplicateSchedule,
  invalidateRoutine,
  resetSchedule,
} from '../api';

/** Saved schedules: make one active, duplicate, delete, or rebuild the default. */
export function ScheduleList({ schedules }: { schedules: ScheduleTemplate[] }) {
  const run = async (label: string, fn: () => Promise<unknown>) => {
    try {
      await fn();
      await invalidateRoutine();
      toast.success(label);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  return (
    <ListSection
      title="Schedules"
      footer="Keep variations (exam month, travel week) as separate schedules and switch between them. Modes still work on top."
    >
      {schedules.map((s) => (
        <div key={s.id} className="flex items-center gap-3 px-4 py-3">
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-2 text-[15px] font-medium">
              <span className="truncate">{s.name}</span>
              {s.isActive && <Badge className="bg-accent text-accent-foreground">Active</Badge>}
            </span>
            <span className="text-[13px] text-muted-foreground">
              {pluralize(s.activityCount, 'activity', 'activities')}
            </span>
          </span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${s.name}`}>
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {!s.isActive && (
                <DropdownMenuItem
                  onSelect={() => void run(`${s.name} is now active`, () => activateSchedule(s.id))}
                >
                  <Star /> Make active
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                onSelect={() => void run('Schedule duplicated', () => duplicateSchedule(s.id))}
              >
                <Copy /> Duplicate
              </DropdownMenuItem>
              {!s.isActive && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    destructive
                    onSelect={() => {
                      if (window.confirm(`Delete “${s.name}”? Its past check-ins are kept.`)) {
                        void run('Schedule deleted', () => deleteSchedule(s.id));
                      }
                    }}
                  >
                    <Trash2 /> Delete
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ))}
      <button
        type="button"
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left text-[15px] text-primary hover:bg-muted/50"
        onClick={() => {
          if (
            window.confirm(
              'Create a fresh default schedule from your setup answers? Your current schedule is kept and can be re-activated.',
            )
          ) {
            void run('Default schedule restored', () => resetSchedule());
          }
        }}
      >
        <RotateCcw className="size-[18px]" /> Reset to default schedule
      </button>
    </ListSection>
  );
}
