import {
  defaultAnswers,
  generateBundle,
  isLocalDate,
  isValidZone,
  logicalDateOf,
  onboardingAnswersSchema,
  resolveJournalPrefs,
  summarizeWeek,
  TEMPLATE_KEYS,
  TEMPLATES,
  type TemplateKey,
} from '@buzzprep/shared';
import type { Types } from 'mongoose';
import { UserProfile } from '../../db/models';
import { badRequest, notFound } from '../../lib/errors';
import { importBundle } from '../config/config-import.service';
import { syncNightReminder } from '../journal/journal-settings.service';
import { getProfile, todayFor } from '../profile/profile.service';

/** Template catalog for step 1 of the setup wizard (without the topic lists). */
export function listTemplates() {
  return TEMPLATES.map((t) => ({
    key: t.key,
    title: t.title,
    tagline: t.tagline,
    goalType: t.goalType,
    durationMonths: t.durationMonths,
    tracks: t.tracks.map((tr) => ({
      ref: tr.ref,
      title: tr.title,
      kind: tr.kind,
      topicCount: tr.topics.length,
    })),
  }));
}

/** Suggested answers for a template, in the user's (or the given) time zone. */
export async function getTemplateDefaults(
  userId: Types.ObjectId,
  key: string,
  options: { timezone?: unknown; today?: unknown },
) {
  if (!TEMPLATE_KEYS.includes(key as TemplateKey)) throw notFound('Template');
  const profile = await getProfile(userId);
  const timezone =
    typeof options.timezone === 'string' && isValidZone(options.timezone)
      ? options.timezone
      : profile.timezone;
  const today =
    typeof options.today === 'string' && isLocalDate(options.today)
      ? options.today
      : logicalDateOf(Date.now(), {
          zone: timezone,
          dayBoundaryMinutes: profile.dayBoundaryMinutes,
        });
  return defaultAnswers(key as TemplateKey, { timezone, today });
}

/** Saved answers, so re-running the wizard starts from the user's previous choices. */
export async function getSavedAnswers(userId: Types.ObjectId) {
  const profile = await getProfile(userId);
  return profile.onboardingAnswers ?? null;
}

/** Generate the plan, routine, reminders, tracks, habits and companies, and apply them. */
export async function completeOnboarding(userId: Types.ObjectId, rawAnswers: unknown) {
  const answers = onboardingAnswersSchema.parse(rawAnswers);
  const bundle = generateBundle(answers);
  const summary = await importBundle(userId, bundle, 'replace');
  await UserProfile.updateOne(
    { userId },
    { $set: { onboardingAnswers: answers, onboardingCompletedAt: new Date() } },
  );
  await keepJournalReminderTiming(userId);
  return { summary, week: summarizeWeek(bundle) };
}

/** Dry run: what would be generated (the wizard also computes this locally). */
export function previewOnboarding(rawAnswers: unknown) {
  const parsed = onboardingAnswersSchema.safeParse(rawAnswers);
  if (!parsed.success) throw badRequest('Invalid answers', parsed.error.issues);
  const bundle = generateBundle(parsed.data);
  return { bundle, week: summarizeWeek(bundle) };
}

/**
 * "Reset to default schedule": regenerate the routine and its reminders from the saved setup
 * answers, as a new active routine. The previous routine, plan, habits and history are kept.
 */
export async function resetToDefaultSchedule(userId: Types.ObjectId) {
  const profile = await getProfile(userId);
  if (!profile.onboardingAnswers) {
    throw badRequest('No saved setup answers — run the setup wizard instead.');
  }
  const bundle = generateBundle(onboardingAnswersSchema.parse(profile.onboardingAnswers));
  bundle.schedule!.name = `Default (reset ${todayFor(profile)})`;
  const result = await importBundle(
    userId,
    {
      ...bundle,
      user: undefined,
      profile: undefined,
      plan: undefined,
      habits: [],
      career: undefined,
    },
    'replace',
  );
  await keepJournalReminderTiming(userId);
  return result;
}

/** A regenerated routine gets the default journal reminder; re-apply the user's own timing. */
async function keepJournalReminderTiming(userId: Types.ObjectId) {
  const profile = await getProfile(userId);
  if (profile.journal) await syncNightReminder(userId, resolveJournalPrefs(profile.journal));
}
