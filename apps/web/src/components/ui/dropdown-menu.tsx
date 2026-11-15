import { DropdownMenu as Menu } from 'radix-ui';
import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

export const DropdownMenu = Menu.Root;
export const DropdownMenuTrigger = Menu.Trigger;

export function DropdownMenuContent({
  className,
  sideOffset = 6,
  ...props
}: ComponentProps<typeof Menu.Content>) {
  return (
    <Menu.Portal>
      <Menu.Content
        sideOffset={sideOffset}
        className={cn(
          'z-50 min-w-48 overflow-hidden rounded-[12px] border bg-popover p-1 text-popover-foreground shadow-[0_10px_30px_rgb(0_0_0/0.14)] data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
          className,
        )}
        {...props}
      />
    </Menu.Portal>
  );
}

export function DropdownMenuItem({
  className,
  destructive,
  ...props
}: ComponentProps<typeof Menu.Item> & { destructive?: boolean }) {
  return (
    <Menu.Item
      className={cn(
        'flex h-10 cursor-default select-none items-center gap-2.5 rounded-[8px] px-2.5 text-[15px] outline-none data-[highlighted]:bg-muted data-[disabled]:opacity-50 [&_svg]:size-4 [&_svg]:text-muted-foreground',
        destructive && 'text-destructive [&_svg]:text-destructive',
        className,
      )}
      {...props}
    />
  );
}

export function DropdownMenuSeparator() {
  return <Menu.Separator className="-mx-1 my-1 h-px bg-border" />;
}
