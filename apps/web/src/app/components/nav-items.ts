import { BookOpen, CalendarDays, CircleUserRound, House, NotebookPen } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  /** Only active on this exact path, not on the pages below it. */
  end?: boolean;
}

/** The places you move between all day, in every layout. */
export const PRIMARY_NAV: NavItem[] = [
  { to: '/', label: 'Home', icon: House, end: true },
  { to: '/schedule', label: 'Schedule', icon: CalendarDays },
  { to: '/learn', label: 'Learn', icon: BookOpen },
  { to: '/journal', label: 'Journal', icon: NotebookPen },
];

/** Phones show Profile as a fifth tab; wider screens reach it from the account menu. */
export const PROFILE_NAV: NavItem = { to: '/profile', label: 'Profile', icon: CircleUserRound };
