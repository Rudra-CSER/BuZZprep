import { cn } from '@/lib/utils';

/**
 * The opening for a first visit: two drowsy Zs float up, buzz like a reminder, and the name forms
 * around them before it flies into the header (see ../motion). Purely decorative; it covers the
 * page only while it plays, and any tap, key or scroll hurries it along.
 */
export function IntroSplash() {
  return (
    <div data-anim="intro" aria-hidden className="fixed inset-0 z-[70] grid place-items-center">
      <div data-anim="intro-bg" className="absolute inset-0 bg-chrome" />
      <span
        data-anim="intro-mark"
        // Drawn at the optical size of the header's wordmark, so it lands as the same letters.
        style={{ fontVariationSettings: "'opsz' 19" }}
        className="relative inline-flex items-baseline whitespace-nowrap text-[clamp(44px,12vw,76px)] font-semibold leading-none tracking-[-0.015em] text-chrome-foreground [--gold:var(--gold-bright)]"
      >
        <span className="inline-block overflow-x-clip">
          <span data-anim="intro-bu" className="inline-block">
            bu
          </span>
        </span>
        <span data-anim="intro-zz" className="relative inline-flex text-gold">
          <span data-anim="intro-z" className="inline-block">
            Z
          </span>
          <span data-anim="intro-z" className="inline-block">
            Z
          </span>
          <BuzzMarks side="left" />
          <BuzzMarks side="right" />
        </span>
        <span className="inline-block overflow-x-clip">
          <span data-anim="intro-prep" className="inline-block">
            prep
          </span>
        </span>
      </span>
    </div>
  );
}

/** Vibration marks either side of the Zs, like a phone buzzing on a desk. */
function BuzzMarks({ side }: { side: 'left' | 'right' }) {
  return (
    <svg
      data-anim="intro-arc"
      viewBox="0 0 12 24"
      className={cn(
        'absolute top-[0.18em] h-[0.62em] w-[0.3em] overflow-visible',
        side === 'left' ? 'left-[-0.38em]' : 'right-[-0.38em]',
      )}
    >
      <g fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round">
        {side === 'left' ? (
          <>
            <path d="M10 7 Q7 12 10 17" />
            <path d="M6 3 Q1 12 6 21" />
          </>
        ) : (
          <>
            <path d="M2 7 Q5 12 2 17" />
            <path d="M6 3 Q11 12 6 21" />
          </>
        )}
      </g>
    </svg>
  );
}
