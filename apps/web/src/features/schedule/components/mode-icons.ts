import type { ScheduleMode } from '@buzzprep/shared';
import { BatteryLow, Briefcase, HeartPulse, Sun } from 'lucide-react';

/** The icon shown for each day mode. */
export const MODE_ICONS: Record<ScheduleMode, typeof Sun> = {
  normal: Sun,
  busy: Briefcase,
  low_energy: BatteryLow,
  recovery: HeartPulse,
};
