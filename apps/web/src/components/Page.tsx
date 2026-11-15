import { ChevronLeft } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { cn } from '@/lib/utils';

/**
 * Page frame with an iOS-style large title. Content is capped for readable line lengths;
 * `wide` lets calendar views use the full width on desktop.
 */
export function Page({
  title,
  subtitle,
  actions,
  back,
  wide,
  description,
  children,
  className,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  back?: { to: string; label: string };
  wide?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'mx-auto w-full px-4 safe-top sm:px-6 md:pt-[calc(var(--app-top)+2rem)]',
        wide ? 'max-w-6xl' : 'max-w-3xl',
        className,
      )}
    >
      <header className="mb-5 grid gap-1 pt-2">
        {back ? (
          <Link
            to={back.to}
            className="-ml-1.5 mb-1 inline-flex w-fit items-center gap-0.5 text-[15px] text-primary"
          >
            <ChevronLeft className="size-5" />
            {back.label}
          </Link>
        ) : null}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            {subtitle ? (
              <p className="mb-0.5 text-[14px] text-muted-foreground">{subtitle}</p>
            ) : null}
            <h1 className="text-[28px] font-semibold leading-tight tracking-[-0.022em] md:text-[30px]">
              {title}
            </h1>
          </div>
          {actions ? (
            <div className="flex shrink-0 items-center gap-1.5 pt-1">{actions}</div>
          ) : null}
        </div>
        {description ? (
          <p className="max-w-prose text-[15px] text-muted-foreground">{description}</p>
        ) : null}
      </header>
      {children}
    </div>
  );
}
