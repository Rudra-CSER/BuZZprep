import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Round "Things"-style completion control. */
export function CompleteCircle({
  checked,
  onToggle,
  label,
  size = 'md',
  disabled,
}: {
  checked: boolean;
  onToggle: () => void;
  label: string;
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
}) {
  const dims = size === 'lg' ? 'size-8' : size === 'sm' ? 'size-5' : 'size-[22px]';
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      className="-m-2.5 grid shrink-0 place-items-center p-2.5 disabled:opacity-40"
    >
      <span
        className={cn(
          dims,
          'grid place-items-center rounded-full border-[1.5px] transition-[background-color,border-color,transform] duration-200',
          checked
            ? 'scale-100 border-primary bg-primary text-primary-foreground'
            : 'border-muted-foreground/45 bg-transparent hover:border-primary',
        )}
      >
        {checked ? (
          <Check className="size-[70%] animate-in zoom-in-50 duration-200" strokeWidth={3} />
        ) : null}
      </span>
    </button>
  );
}
