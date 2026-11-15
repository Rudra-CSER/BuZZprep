import type {
  JournalPrefs,
  ModeRules,
  OnboardingAnswers,
  ProfileInput,
  ThemePreference,
} from '@buzzprep/shared';
import { Schema, model, type Types } from 'mongoose';

/** Person-level settings. Journey-level data (goal, deadline) lives on Plan. */
export interface IUserProfile extends Omit<ProfileInput, 'theme'> {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  theme: ThemePreference;
  /** Optional per-user overrides of the default schedule-mode rules. */
  modeRules: Partial<ModeRules> | null;
  onboardingAnswers: OnboardingAnswers | null;
  /** Journal preferences; null until changed (read through resolveJournalPrefs). */
  journal: Partial<JournalPrefs> | null;
  onboardingCompletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const mixed = { type: Schema.Types.Mixed };

const profileSchema = new Schema<IUserProfile>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    timezone: { type: String, required: true },
    dayBoundaryMinutes: { type: Number, default: 240, min: 0, max: 720 },
    weekStartsOn: { type: Number, enum: [1, 7], default: 1 },
    professional: { ...mixed, default: () => ({}) },
    education: { ...mixed, default: () => ({}) },
    work: { ...mixed, required: true },
    sleep: { ...mixed, required: true },
    study: { ...mixed, required: true },
    fitness: { ...mixed, required: true },
    restDays: { type: [Number], default: [7] },
    skills: { ...mixed, default: () => ({ levels: {}, notes: null }) },
    notifications: { ...mixed, required: true },
    revisionIntervals: { type: [Number], default: [1, 3, 7, 14, 30] },
    missedGraceMinutes: { type: Number, default: 30 },
    theme: { type: String, enum: ['system', 'light', 'dark'], default: 'system' },
    modeRules: { ...mixed, default: null },
    onboardingAnswers: { ...mixed, default: null },
    journal: { ...mixed, default: null },
    onboardingCompletedAt: { type: Date, default: null },
  },
  { timestamps: true, minimize: false },
);
profileSchema.index({ userId: 1 }, { unique: true });

export const UserProfile = model<IUserProfile>('UserProfile', profileSchema);
