import {
  DEFAULT_DAY_BOUNDARY_MINUTES,
  DEFAULT_MISSED_GRACE_MINUTES,
  logicalDateOf,
  type TimeContext,
} from '@buzzprep/shared';
import { useClock } from '@/lib/clock';
import { browserTimeZone } from '@/lib/format';
import { useProfile } from '../api';

export interface ClientTimeContext extends TimeContext {
  hour12: boolean;
  graceMinutes: number;
  today: string;
}

/** The user's zone, day boundary and display preferences (falls back to the device zone). */
export function useTimeContext(nowOverride?: number): ClientTimeContext {
  const clockNow = useClock((s) => s.now);
  const now = nowOverride ?? clockNow;
  const { data } = useProfile();
  const p = data?.profile;
  const ctx: TimeContext = {
    zone: p?.timezone ?? browserTimeZone(),
    dayBoundaryMinutes: p?.dayBoundaryMinutes ?? DEFAULT_DAY_BOUNDARY_MINUTES,
  };
  return {
    ...ctx,
    hour12: p?.notifications?.hour12 ?? true,
    graceMinutes: p?.missedGraceMinutes ?? DEFAULT_MISSED_GRACE_MINUTES,
    today: logicalDateOf(now, ctx),
  };
}
