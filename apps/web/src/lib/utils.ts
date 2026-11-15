import type { ActivityCategory } from '@buzzprep/shared';
import { clsx, type ClassValue } from 'clsx';
import type { CSSProperties } from 'react';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Inline style that exposes a category's colour as `--cat` for the cat-* utilities. */
export function catVar(category: ActivityCategory | string): CSSProperties {
  return { ['--cat' as string]: `var(--cat-${category})` } as CSSProperties;
}

export function pluralize(n: number, one: string, many = `${one}s`) {
  return `${n} ${n === 1 ? one : many}`;
}
