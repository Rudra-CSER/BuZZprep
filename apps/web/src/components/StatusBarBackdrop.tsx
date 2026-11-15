import { cn } from '@/lib/utils';

/**
 * Fills the strip behind the iOS status bar and Dynamic Island with the navigation's ink. The app
 * runs edge to edge, so the status bar's white text needs a dark backdrop on light screens. It has
 * no height wherever the device reports no top inset (desktop, browser tabs, phones held sideways).
 */
export function StatusBarBackdrop({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        'chrome pointer-events-none fixed inset-x-0 top-0 z-[60] h-[var(--safe-top)]',
        className,
      )}
    />
  );
}
