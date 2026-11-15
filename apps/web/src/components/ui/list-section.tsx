import { ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { cn } from '@/lib/utils';

/** Grouped list in the iOS settings style: a titled card of rows. */
export function ListSection({
  title,
  action,
  footer,
  children,
  className,
}: {
  title?: ReactNode;
  action?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('grid gap-2', className)}>
      {(title || action) && (
        <div className="flex items-end justify-between gap-3 px-1">
          {title ? (
            <h2 className="text-[17px] font-semibold tracking-[-0.01em]">{title}</h2>
          ) : (
            <span />
          )}
          {action}
        </div>
      )}
      <div className="overflow-hidden rounded-[14px] border bg-card [&>*+*]:border-t">
        {children}
      </div>
      {footer ? (
        <p className="px-1 text-[13px] leading-snug text-muted-foreground">{footer}</p>
      ) : null}
    </section>
  );
}

export function ListLink({
  to,
  icon,
  title,
  detail,
  className,
}: {
  to: string;
  icon?: ReactNode;
  title: ReactNode;
  detail?: ReactNode;
  className?: string;
}) {
  return (
    <Link
      to={to}
      className={cn('flex min-h-13 items-center gap-3 px-4 py-2.5 hover:bg-muted/60', className)}
    >
      {icon ? (
        <span className="grid size-8 shrink-0 place-items-center rounded-[9px] bg-muted text-foreground [&_svg]:size-[18px]">
          {icon}
        </span>
      ) : null}
      <span className="min-w-0 flex-1 text-[15px]">{title}</span>
      {detail ? <span className="shrink-0 text-[14px] text-muted-foreground">{detail}</span> : null}
      <ChevronRight className="size-4 shrink-0 text-muted-foreground/70" />
    </Link>
  );
}
