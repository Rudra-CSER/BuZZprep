import { ACTIVITY_CATEGORIES, CATEGORY_META } from '@buzzprep/shared';
import type { ActivityCategory } from '@buzzprep/shared';
import { catVar, cn } from '@/lib/utils';

/** Category chips, each in its own colour. */
export function CategoryPicker({
  value,
  onChange,
}: {
  value: ActivityCategory;
  onChange: (category: ActivityCategory) => void;
}) {
  return (
    <div className="grid gap-2">
      <span className="text-[14px] font-medium">Category</span>
      <div className="flex flex-wrap gap-2">
        {ACTIVITY_CATEGORIES.map((c) => (
          <button
            key={c}
            type="button"
            style={catVar(c)}
            aria-pressed={value === c}
            onClick={() => onChange(c)}
            className={cn(
              'inline-flex h-9 items-center gap-2 rounded-full border px-3 text-[14px]',
              value === c
                ? 'border-[var(--cat)] cat-tint font-medium'
                : 'bg-card text-muted-foreground',
            )}
          >
            <span className="size-2 rounded-full cat-dot" />
            {CATEGORY_META[c].label}
          </button>
        ))}
      </div>
    </div>
  );
}
