import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

/** Edit a list of short lines: one input per item, remove buttons, and "Add". */
export function ListEditor({
  label,
  items,
  onChange,
  placeholder,
  addLabel = 'Add',
}: {
  label: string;
  items: string[];
  onChange: (items: string[]) => void;
  placeholder?: string;
  addLabel?: string;
}) {
  return (
    <div className="grid gap-2">
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-2">
          <Input
            value={item}
            onChange={(e) => onChange(items.map((v, j) => (j === i ? e.target.value : v)))}
            placeholder={placeholder}
            aria-label={`${label} ${i + 1}`}
          />
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            onClick={() => onChange(items.filter((_, j) => j !== i))}
            aria-label={`Remove ${label.toLowerCase()} ${i + 1}`}
          >
            <X />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="w-fit text-primary"
        onClick={() => onChange([...items, ''])}
      >
        <Plus /> {addLabel}
      </Button>
    </div>
  );
}
