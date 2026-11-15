import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * A phone-shaped frame for a preview of the app. The screen is laid out at 375 × 780 px, like the
 * app on a phone, then scaled by `--s` (set it with a class such as `[--s:0.8]`), so the preview
 * keeps the app's real proportions at any size.
 */
export function PhoneFrame({
  label,
  className,
  anim,
  children,
}: {
  label: string;
  className?: string;
  /** Hook for the welcome page's motion. */
  anim?: string;
  children: ReactNode;
}) {
  return (
    <figure
      role="img"
      aria-label={label}
      data-anim={anim}
      className={cn(
        'm-0 shrink-0 rounded-[calc(54px*var(--s))] bg-[#0a0b11] p-[calc(9px*var(--s))] shadow-[0_30px_70px_-20px_rgb(0_0_0/0.55)] ring-1 ring-white/10',
        className,
      )}
    >
      <div className="relative h-[calc(780px*var(--s))] w-[calc(375px*var(--s))] overflow-hidden rounded-[calc(45px*var(--s))]">
        <div className="absolute left-0 top-0 h-[780px] w-[375px] origin-top-left [transform:scale(var(--s))]">
          {children}
        </div>
      </div>
    </figure>
  );
}
