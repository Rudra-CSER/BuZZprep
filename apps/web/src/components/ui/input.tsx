import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';
import { controlClass } from './control-styles';

export function Input({ className, ...props }: ComponentProps<'input'>) {
  return <input data-slot="input" className={cn(controlClass, 'h-11', className)} {...props} />;
}
