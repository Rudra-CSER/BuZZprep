import { X } from 'lucide-react';
import { useState, type KeyboardEvent } from 'react';
import { cn } from '@/lib/utils';

/** Type a value and press Enter (or comma) to add it; tap × to remove. */
export function TagInput({
  id,
  value,
  onChange,
  placeholder,
  max = 50,
}: {
  id?: string;
  value: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
  max?: number;
}) {
  const [draft, setDraft] = useState('');
  const add = (raw: string) => {
    const items = raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const next = [...value];
    for (const item of items) {
      if (!next.some((v) => v.toLowerCase() === item.toLowerCase()) && next.length < max)
        next.push(item.slice(0, 60));
    }
    onChange(next);
    setDraft('');
  };
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === 'Enter' || e.key === ',') && draft.trim()) {
      e.preventDefault();
      add(draft);
    } else if (e.key === 'Backspace' && !draft && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  };
  return (
    <div
      className={cn(
        'flex min-h-11 flex-wrap items-center gap-1.5 rounded-[10px] border border-input bg-card px-2 py-1.5 focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/25',
      )}
    >
      {value.map((v) => (
        <span
          key={v}
          className="inline-flex h-8 items-center gap-1 rounded-full bg-muted pl-3 pr-1 text-[14px]"
        >
          {v}
          <button
            type="button"
            onClick={() => onChange(value.filter((x) => x !== v))}
            className="grid size-6 place-items-center rounded-full text-muted-foreground hover:bg-background hover:text-foreground"
            aria-label={`Remove ${v}`}
          >
            <X className="size-3.5" />
          </button>
        </span>
      ))}
      <input
        id={id}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKey}
        onBlur={() => draft.trim() && add(draft)}
        placeholder={value.length === 0 ? placeholder : 'Add another'}
        enterKeyHint="done"
        className="h-8 min-w-32 flex-1 bg-transparent px-1.5 text-[15px] outline-none placeholder:text-muted-foreground/70"
      />
    </div>
  );
}
