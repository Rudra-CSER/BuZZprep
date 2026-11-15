import type { Model } from 'mongoose';
import { Activity } from './activity.model';
import { AiJob } from './ai-job.model';
import { ActivityOccurrence } from './activity-occurrence.model';
import { CareerApplication } from './career-application.model';
import { DayPlan } from './day-plan.model';
import { DSAProblem } from './dsa-problem.model';
import { Habit } from './habit.model';
import { HabitCompletion } from './habit-completion.model';
import { JournalEntry } from './journal-entry.model';
import { LearningTopic } from './learning-topic.model';
import { LearningTrack } from './learning-track.model';
import { Notification } from './notification.model';
import { Plan } from './plan.model';
import { PushSubscriptionModel } from './push-subscription.model';
import { Reminder } from './reminder.model';
import { ScheduleTemplate } from './schedule-template.model';
import { Session } from './session.model';
import { StudySession } from './study-session.model';
import { User } from './user.model';
import { UserProfile } from './user-profile.model';
import { WeeklyReview } from './weekly-review.model';

// Accounts
export * from './user.model';
export * from './session.model';
export * from './user-profile.model';
// Plan and schedule
export * from './plan.model';
export * from './schedule-template.model';
export * from './activity.model';
export * from './activity-occurrence.model';
export * from './day-plan.model';
// Reminders and delivery
export * from './reminder.model';
export * from './push-subscription.model';
export * from './notification.model';
// Learning
export * from './subdocuments';
export * from './learning-track.model';
export * from './learning-topic.model';
export * from './dsa-problem.model';
export * from './study-session.model';
// Personal
export * from './journal-entry.model';
export * from './weekly-review.model';
export * from './habit.model';
export * from './habit-completion.model';
export * from './career-application.model';
// Background work
export * from './ai-job.model';

/**
 * Every collection that holds per-user data, keyed by its export name.
 * Used by account export and account deletion — add new user-owned models here.
 * (Voice recordings live in GridFS, not in a model; account deletion removes them separately.)
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- heterogeneous model map
export const USER_OWNED_MODELS: Record<string, Model<any>> = {
  profile: UserProfile,
  plans: Plan,
  tracks: LearningTrack,
  topics: LearningTopic,
  problems: DSAProblem,
  studySessions: StudySession,
  schedules: ScheduleTemplate,
  activities: Activity,
  occurrences: ActivityOccurrence,
  dayModes: DayPlan,
  reminders: Reminder,
  pushSubscriptions: PushSubscriptionModel,
  notifications: Notification,
  journal: JournalEntry,
  weeklyReviews: WeeklyReview,
  aiJobs: AiJob,
  habits: Habit,
  habitCompletions: HabitCompletion,
  applications: CareerApplication,
  sessions: Session,
};

export const ALL_MODELS = [User, ...Object.values(USER_OWNED_MODELS)];
