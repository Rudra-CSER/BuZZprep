import type { Occurrence } from '@buzzprep/shared';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { OccurrenceDetails } from './OccurrenceDetails';

export function OccurrenceSheet({
  occurrence,
  open,
  onOpenChange,
  now,
}: {
  occurrence: Occurrence | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  now: number;
}) {
  return (
    <Sheet open={open && !!occurrence} onOpenChange={onOpenChange}>
      <SheetContent aria-describedby={undefined}>
        {occurrence ? (
          <OccurrenceDetails
            key={occurrence.key}
            occurrence={occurrence}
            now={now}
            onDone={() => onOpenChange(false)}
          />
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
