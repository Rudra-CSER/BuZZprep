import { MOOD_LABEL, MOODS, type Mood } from '@buzzprep/shared';
import { cn } from '@/lib/utils';

/** Five words, not faces: quick to tap, easy to read at night. */
export function MoodPicker({
  value,
  onChange,
}: {
  value: Mood | null;
  onChange: (mood: Mood | null) => void;
}) {
  return (
    <div role="radiogroup" aria-label="How did today feel?" className="grid grid-cols-5 gap-2">
      {MOODS.map((m) => {
        const on = value === m;
        return (
          <button
            key={m}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(on ? null : m)}
            className={cn(
              'h-11 rounded-full border px-1 text-[15px] font-medium transition-colors',
              on
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-input text-foreground hover:bg-muted',
            )}
          >
            {MOOD_LABEL[m]}
          </button>
        );
      })}
    </div>
  );
}

/** Energy 1–5 as a row of steps. */
export function EnergyPicker({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (energy: number | null) => void;
}) {
  return (
    <div className="grid gap-2">
      <div role="radiogroup" aria-label="Energy, 1 to 5" className="flex items-center gap-1.5">
        {[1, 2, 3, 4, 5].map((n) => {
          const on = value !== null && n <= value;
          return (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={value === n}
              aria-label={`Energy ${n} of 5`}
              onClick={() => onChange(value === n ? null : n)}
              className="group grid h-11 flex-1 place-items-center"
            >
              <span
                className={cn(
                  'h-2 w-full rounded-full transition-colors',
                  on ? 'bg-primary' : 'bg-muted group-hover:bg-input',
                )}
              />
            </button>
          );
        })}
      </div>
      <div className="flex justify-between text-[13px] text-muted-foreground">
        <span>Drained</span>
        <span aria-hidden>{value ? `${value} of 5` : ''}</span>
        <span>Full</span>
      </div>
    </div>
  );
}
