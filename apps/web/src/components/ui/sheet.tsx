import { X } from 'lucide-react';
import { Dialog as DialogPrimitive } from 'radix-ui';
import type { ComponentProps, ReactNode } from 'react';
import { cn } from '@/lib/utils';

export const Sheet = DialogPrimitive.Root;
export const SheetTrigger = DialogPrimitive.Trigger;
export const SheetClose = DialogPrimitive.Close;

/**
 * Bottom sheet on phones (thumb-reachable, like iOS), centred dialog from `md` up.
 */
export function SheetContent({
  className,
  children,
  hideClose,
  onOpenAutoFocus,
  ...props
}: ComponentProps<typeof DialogPrimitive.Content> & { hideClose?: boolean }) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/35 backdrop-blur-[2px] data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
      <DialogPrimitive.Content
        className={cn(
          'fixed z-50 flex flex-col bg-popover text-popover-foreground shadow-[0_-8px_40px_rgb(0_0_0/0.18)] outline-none',
          // phone: bottom sheet
          'inset-x-0 bottom-0 max-h-[92dvh] rounded-t-[22px] pb-[var(--safe-bottom)]',
          'data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom data-[state=open]:duration-300',
          'data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom data-[state=closed]:duration-200',
          // tablet/desktop: dialog
          'md:inset-auto md:left-1/2 md:top-1/2 md:w-full md:max-w-lg md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-[20px] md:pb-0',
          'md:data-[state=open]:slide-in-from-bottom-4 md:data-[state=open]:fade-in-0 md:data-[state=closed]:fade-out-0 md:data-[state=closed]:slide-out-to-bottom-2',
          className,
        )}
        tabIndex={-1}
        onOpenAutoFocus={(e) => {
          onOpenAutoFocus?.(e);
          if (e.defaultPrevented) return;
          // Focus the sheet rather than its first input: on phones that would open the keyboard.
          e.preventDefault();
          (e.currentTarget as HTMLElement | null)?.focus?.();
        }}
        {...props}
      >
        <div
          aria-hidden
          className="mx-auto mt-2 h-1.5 w-10 shrink-0 rounded-full bg-border md:hidden"
        />
        {children}
        {!hideClose && (
          <DialogPrimitive.Close
            className="absolute right-3 top-3 grid size-9 place-items-center rounded-full bg-muted text-muted-foreground hover:text-foreground"
            aria-label="Close"
          >
            <X className="size-4" />
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

export function SheetHeader({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('px-5 pb-2 pt-4 pr-14', className)} {...props} />;
}

export function SheetTitle({ className, ...props }: ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      className={cn('text-[19px] font-semibold tracking-[-0.01em]', className)}
      {...props}
    />
  );
}

export function SheetDescription({
  className,
  ...props
}: ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      className={cn('mt-1 text-[14px] text-muted-foreground', className)}
      {...props}
    />
  );
}

export function SheetBody({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      className={cn('min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-5', className)}
      {...props}
    />
  );
}

export function SheetFooter({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn('flex gap-2 border-t px-5 py-3', className)}>{children}</div>;
}
