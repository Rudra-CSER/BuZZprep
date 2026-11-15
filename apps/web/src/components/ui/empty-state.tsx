import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function EmptyState({
  icon,
  title,
  children,
  action,
  className,
}: {
  icon?: ReactNode;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center gap-3 rounded-[14px] border border-dashed px-6 py-10 text-center',
        className,
      )}
    >
      {icon ? (
        <div className="grid size-11 place-items-center rounded-full bg-muted text-muted-foreground [&_svg]:size-5">
          {icon}
        </div>
      ) : null}
      <div className="grid gap-1">
        <p className="text-[16px] font-semibold">{title}</p>
        {children ? (
          <p className="mx-auto max-w-sm text-[14px] text-muted-foreground">{children}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}
