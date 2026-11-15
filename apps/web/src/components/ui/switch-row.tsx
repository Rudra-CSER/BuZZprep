import { useId, type ReactNode } from 'react';
import { Switch } from './switch';

/** A row with a title/description on the left and a switch on the right (settings lists). */
export function SwitchRow({
  title,
  description,
  checked,
  onCheckedChange,
  disabled,
}: {
  title: ReactNode;
  description?: ReactNode;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <div className="flex min-h-14 items-center gap-4 px-4 py-2.5">
      <label htmlFor={id} className="min-w-0 flex-1 cursor-pointer">
        <span className="block text-[15px]">{title}</span>
        {description ? (
          <span className="block text-[13px] text-muted-foreground">{description}</span>
        ) : null}
      </label>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} disabled={disabled} />
    </div>
  );
}
