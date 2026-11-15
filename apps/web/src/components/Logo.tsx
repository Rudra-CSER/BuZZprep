import { cn } from '@/lib/utils';

/** The buZZprep mark. Pass `decorative` when the name is already written next to it. */
export function Logo({ className, decorative }: { className?: string; decorative?: boolean }) {
  return (
    <svg
      viewBox="0 0 512 512"
      className={cn('shrink-0', className)}
      {...(decorative ? { 'aria-hidden': true } : { role: 'img', 'aria-label': 'buZZprep' })}
    >
      <rect width="512" height="512" rx="120" fill="#4b45e3" />
      <path
        d="M120 324 L200 244 L200 324 L280 244 L280 324 L392 180"
        fill="none"
        stroke="#fff"
        strokeWidth="50"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
