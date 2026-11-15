import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

export function Badge({ className, ...props }: ComponentProps<'span'>) {
  return (
    <span
      className={cn(
        'inline-flex h-6 items-center gap-1 rounded-full bg-muted px-2.5 text-[12.5px] font-medium text-muted-foreground',
        className,
      )}
      {...props}
    />
  );
}
