/** −/+ stepper for minutes and counts (thumb-friendly alternative to sliders). */
export function Stepper({
  value,
  onChange,
  min = 0,
  max = 999,
  step = 1,
  format = (v: number) => String(v),
  label,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  format?: (v: number) => string;
  label: string;
}) {
  return (
    <div
      className="inline-flex items-center rounded-[11px] border border-input bg-card"
      role="group"
      aria-label={label}
    >
      <button
        type="button"
        className="h-11 w-11 text-xl text-muted-foreground disabled:opacity-40"
        onClick={() => onChange(Math.max(min, value - step))}
        disabled={value <= min}
        aria-label={`Decrease ${label}`}
      >
        −
      </button>
      <output className="tabular min-w-20 text-center text-[15px] font-medium" aria-live="polite">
        {format(value)}
      </output>
      <button
        type="button"
        className="h-11 w-11 text-xl text-muted-foreground disabled:opacity-40"
        onClick={() => onChange(Math.min(max, value + step))}
        disabled={value >= max}
        aria-label={`Increase ${label}`}
      >
        +
      </button>
    </div>
  );
}
