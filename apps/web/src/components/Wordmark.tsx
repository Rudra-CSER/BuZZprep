import { cn } from '@/lib/utils';

/**
 * The buZZprep name as a logotype: "bu" and "prep" in the surrounding text colour, "ZZ" in the
 * brand gold. The styled letters are hidden from screen readers, which hear one word instead.
 */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn('whitespace-nowrap font-display font-bold', className)}>
      <span aria-hidden="true">
        bu<span className="text-gold">ZZ</span>prep
      </span>
      <span className="sr-only">buZZprep</span>
    </span>
  );
}
