import { cn } from '@/lib/utils';

/** Multi-select pill toggles (weekdays, categories…). */
export function ChipGroup<T extends string | number>({
  options,
  value,
  onChange,
  multiple = true,
  className,
  ariaLabel,
}: {
  options: Array<{ value: T; label: string }>;
  value: T[];
  onChange: (next: T[]) => void;
  multiple?: boolean;
  className?: string;
  ariaLabel?: string;
}) {
  return (
    <div role="group" aria-label={ariaLabel} className={cn('flex flex-wrap gap-2', className)}>
      {options.map((o) => {
        const on = value.includes(o.value);
        return (
          <button
            key={String(o.value)}
            type="button"
            aria-pressed={on}
            onClick={() =>
              onChange(
                multiple
                  ? on
                    ? value.filter((v) => v !== o.value)
                    : [...value, o.value]
                  : [o.value],
              )
            }
            className={cn(
              'h-9 min-w-11 rounded-full border px-3.5 text-[14px] font-medium transition-colors',
              on
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-input bg-card text-foreground hover:bg-muted',
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
