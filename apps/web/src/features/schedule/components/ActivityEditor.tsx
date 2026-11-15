import type { Activity } from '@/api/types';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { ActivityForm } from './ActivityForm';

export function ActivityEditor({
  activity,
  open,
  onOpenChange,
  today,
}: {
  activity: Activity | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  today: string;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent aria-describedby={undefined} className="md:max-w-xl">
        {/* Remounted per activity, so the form always starts from the saved values. */}
        <ActivityForm
          key={activity?.id ?? 'new'}
          activity={activity}
          today={today}
          onClose={() => onOpenChange(false)}
        />
      </SheetContent>
    </Sheet>
  );
}
