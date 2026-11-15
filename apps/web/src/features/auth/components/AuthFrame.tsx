import type { ReactNode } from 'react';
import { Logo } from '@/components/Logo';
import { StatusBarBackdrop } from '@/components/StatusBarBackdrop';

export function AuthFrame({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col items-center px-5 safe-top">
      <StatusBarBackdrop />
      <div className="flex w-full max-w-sm flex-1 flex-col justify-center gap-8 py-10">
        <div className="grid gap-4">
          <Logo className="size-12 rounded-[14px]" />
          <div className="grid gap-1.5">
            <h1 className="text-[28px] font-semibold leading-tight tracking-[-0.022em]">{title}</h1>
            <p className="text-[15px] text-muted-foreground">{subtitle}</p>
          </div>
        </div>
        {children}
        <p className="text-[14px] text-muted-foreground">{footer}</p>
      </div>
    </div>
  );
}
