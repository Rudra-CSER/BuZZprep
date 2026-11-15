import { MODE_META, type ScheduleMode } from '@buzzprep/shared';
import { cn } from '@/lib/utils';
import { MODE_ICONS } from './mode-icons';

/** The day's mode as a small chip; tapping it opens the mode sheet. */
export function ModeChip({ mode, onClick }: { mode: ScheduleMode; onClick: () => void }) {
  const Icon = MODE_ICONS[mode];
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-[13px] font-medium transition-colors',
        mode === 'normal'
          ? 'bg-card text-muted-foreground hover:text-foreground'
          : 'border-primary/30 bg-accent text-accent-foreground',
      )}
    >
      <Icon className="size-3.5" />
      {MODE_META[mode].label}
    </button>
  );
}
