import {
  DEFAULT_DAY_BOUNDARY_MINUTES,
  DEFAULT_MISSED_GRACE_MINUTES,
  DEFAULT_MODE_RULES,
  DEFAULT_NOTIFICATION_PREFERENCES,
  DEFAULT_REVISION_INTERVALS,
  logicalDateOf,
  type LocalDate,
  type ModeRules,
  type NotificationPreferences,
  type ProfilePatch,
  type TimeContext,
  type Weekday,
} from '@buzzprep/shared';
import type { Types } from 'mongoose';
import { UserProfile, type IUserProfile } from '../../db/models';

export type ProfileDoc = IUserProfile;

export function defaultProfileFields(timezone: string) {
  return {
    timezone,
    dayBoundaryMinutes: DEFAULT_DAY_BOUNDARY_MINUTES,
    weekStartsOn: 1 as const,
    professional: { designation: null, organization: null, workPressure: null },
    education: { degree: null, field: null, institution: null, grade: null },
    work: {
      enabled: false,
      label: 'Work',
      days: [1, 2, 3, 4, 5] as Weekday[],
      start: '09:30',
      end: '18:00',
      commuteMinutes: 0,
      pressure: null,
    },
    sleep: {
      currentBedtime: '23:30',
      currentWake: '07:00',
      targetBedtime: '23:30',
      targetWake: '07:00',
      gradualShift: false,
    },
    study: {
      weekdayMinutes: 60,
      weekendMinutes: 60,
      preferredWindow: 'evening' as const,
      morningRevisionMinutes: 0,
    },
    fitness: {
      enabled: false,
      sessionsPerWeek: 0,
      days: [] as Weekday[],
      durationMinutes: 60,
      time: null,
    },
    restDays: [7] as Weekday[],
    skills: { levels: {}, notes: null },
    notifications: { ...DEFAULT_NOTIFICATION_PREFERENCES },
    revisionIntervals: [...DEFAULT_REVISION_INTERVALS],
    missedGraceMinutes: DEFAULT_MISSED_GRACE_MINUTES,
    theme: 'system' as const,
  };
}

/** Profile fields that change when reminders fire, so updating them re-plans reminders. */
const RESCHEDULING_FIELDS = [
  'timezone',
  'dayBoundaryMinutes',
  'notifications',
  'missedGraceMinutes',
];

export async function getProfile(userId: Types.ObjectId): Promise<ProfileDoc> {
  const profile = await UserProfile.findOne({ userId }).lean<ProfileDoc>();
  if (profile) return profile;
  // Self-heal: profiles are created at registration, but never fail a request for lack of one.
  await UserProfile.updateOne(
    { userId },
    { $setOnInsert: { userId, ...defaultProfileFields('UTC') } },
    { upsert: true },
  );
  return (await UserProfile.findOne({ userId }).lean<ProfileDoc>())!;
}

/** Apply a partial update. `affectsReminders` tells the caller to re-plan notifications. */
export async function updateProfile(
  userId: Types.ObjectId,
  patch: ProfilePatch,
): Promise<{ profile: ProfileDoc; affectsReminders: boolean }> {
  await getProfile(userId); // ensure it exists
  await UserProfile.updateOne({ userId }, { $set: patch });
  return {
    profile: await getProfile(userId),
    affectsReminders: Object.keys(patch).some((k) => RESCHEDULING_FIELDS.includes(k)),
  };
}

export function timeContext(
  profile: Pick<ProfileDoc, 'timezone' | 'dayBoundaryMinutes'>,
): TimeContext {
  return {
    zone: profile.timezone,
    dayBoundaryMinutes: profile.dayBoundaryMinutes ?? DEFAULT_DAY_BOUNDARY_MINUTES,
  };
}

export function notificationPrefs(
  profile: Pick<ProfileDoc, 'notifications'>,
): NotificationPreferences {
  return {
    ...DEFAULT_NOTIFICATION_PREFERENCES,
    ...(profile.notifications ?? {}),
    quietHours: {
      ...DEFAULT_NOTIFICATION_PREFERENCES.quietHours,
      ...(profile.notifications?.quietHours ?? {}),
    },
  } as NotificationPreferences;
}

export function modeRules(profile: Pick<ProfileDoc, 'modeRules'>): ModeRules {
  if (!profile.modeRules) return DEFAULT_MODE_RULES;
  return { ...DEFAULT_MODE_RULES, ...profile.modeRules } as ModeRules;
}

export function todayFor(
  profile: Pick<ProfileDoc, 'timezone' | 'dayBoundaryMinutes'>,
  now = Date.now(),
): LocalDate {
  return logicalDateOf(now, timeContext(profile));
}

/** Shape returned to the client (no internal fields). */
export function publicProfile(profile: ProfileDoc) {
  const {
    _id: _id,
    userId: _userId,
    onboardingAnswers,
    modeRules: _rules,
    ...rest
  } = profile as ProfileDoc & { __v?: number };
  const { __v: _v, ...clean } = rest as typeof rest & { __v?: number };
  return {
    ...clean,
    onboardingCompleted: !!profile.onboardingCompletedAt,
    hasOnboardingAnswers: !!onboardingAnswers,
  };
}
