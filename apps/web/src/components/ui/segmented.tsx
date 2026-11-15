import { ToggleGroup } from 'radix-ui';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function Segmented<T extends string>({
  value,
  onValueChange,
  options,
  className,
  itemClassName,
  ariaLabel,
}: {
  value: T;
  onValueChange: (v: T) => void;
  options: Array<{ value: T; label: ReactNode }>;
  className?: string;
  /** Extra classes for each option (e.g. a different selected colour on dark surfaces). */
  itemClassName?: string;
  ariaLabel: string;
}) {
  return (
    <ToggleGroup.Root
      type="single"
      value={value}
      onValueChange={(v) => v && onValueChange(v as T)}
      aria-label={ariaLabel}
      className={cn('inline-flex rounded-[11px] bg-muted p-[3px]', className)}
    >
      {options.map((o) => (
        <ToggleGroup.Item
          key={o.value}
          value={o.value}
          className={cn(
            'h-8 flex-1 rounded-[8px] px-3 text-[14px] font-medium text-muted-foreground transition-colors data-[state=on]:bg-card data-[state=on]:text-foreground data-[state=on]:shadow-[0_1px_2px_rgb(0_0_0/0.08)]',
            itemClassName,
          )}
        >
          {o.label}
        </ToggleGroup.Item>
      ))}
    </ToggleGroup.Root>
  );
}
