/**
 * Shapes of the API's responses. Domain types (occurrences, recurrence…) come from the shared
 * package, so client and server agree on them by construction.
 */
import type {
  ActivityCategory,
  ActivityReminderPresets,
  Consistency,
  DayCompletion,
  LocalDate,
  ModeAction,
  NotificationPrefsInput,
  Occurrence,
  OnboardingAnswers,
  PrepProgress,
  Priority,
  ProblemStats,
  ProfileInput,
  Recurrence,
  ReminderAnchor,
  ReminderKind,
  ScheduleMode,
  SlotSuggestion,
  TimeProgression,
} from '@buzzprep/shared';

export type { ActivityCategory, LocalDate, Occurrence, ReminderKind, ScheduleMode, SlotSuggestion };

export interface User {
  id: string;
  email: string;
  displayName: string;
  role: 'user' | 'admin';
  createdAt: string;
}

export interface MeResponse {
  user: User;
  onboardingCompleted: boolean;
  timezone: string;
  theme: 'system' | 'light' | 'dark';
}

export interface MetaResponse {
  name: string;
  version: string;
  registrationMode: 'open' | 'invite' | 'closed';
  pushEnabled: boolean;
  /** No accounts exist yet: the next sign-up creates the server's owner (admin) account. */
  setupRequired?: boolean;
}

export interface Profile extends ProfileInput {
  onboardingCompleted: boolean;
  hasOnboardingAnswers: boolean;
  onboardingCompletedAt: string | null;
}

export interface Milestone {
  id: string;
  title: string;
  dueDate: LocalDate;
  completed: boolean;
  completedAt: string | null;
  note: string | null;
}

export interface Plan {
  id: string;
  title: string;
  goalType: string;
  targetRole: string | null;
  targetCompanies: string[];
  stretchCompanies: string[];
  compensationTarget: string | null;
  description: string | null;
  startDate: LocalDate;
  deadline: LocalDate;
  status: 'active' | 'paused' | 'completed' | 'archived';
  milestones: Milestone[];
}

export interface WeekDay {
  date: LocalDate;
  planned: number;
  done: number;
  percent: number | null;
  studyMinutes: number;
}

export interface DashboardResponse {
  now: string;
  today: LocalDate;
  timezone: string;
  greeting: string;
  displayName: string;
  onboardingCompleted: boolean;
  mode: ScheduleMode;
  plan: {
    id: string;
    title: string;
    targetRole: string | null;
    startDate: LocalDate;
    deadline: LocalDate;
    progress: PrepProgress;
    upcomingMilestones: Milestone[];
  } | null;
  todayAgenda: { spillover: Occurrence[]; occurrences: Occurrence[] };
  completion: DayCompletion;
  needsReview: number;
  nextSession: Occurrence | null;
  nextReminder: {
    title: string;
    body: string;
    fireAt: string;
    kind: string;
    queued: boolean;
  } | null;
  week: { days: WeekDay[] } & Consistency;
  dsa: ProblemStats & { dueRevisions: number };
  systemDesign: {
    concepts: number;
    conceptsCompleted: number;
    practice: number;
    practiceCompleted: number;
    dueRevisions: number;
  };
  journal: { morning: boolean; evening: boolean };
  push: { serverEnabled: boolean; devices: number };
}

export interface AgendaResponse {
  from: LocalDate;
  to: LocalDate;
  today: LocalDate;
  now: string;
  timezone: string;
  dayBoundaryMinutes: number;
  missedGraceMinutes: number;
  occurrences: Occurrence[];
  dayModes: Record<LocalDate, ScheduleMode>;
}

export interface Activity {
  id: string;
  templateId: string;
  title: string;
  description: string | null;
  category: ActivityCategory;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  recurrence: Recurrence;
  recurrenceLabel: string;
  priority: Priority;
  essential: boolean;
  blocking: boolean;
  trackId: string | null;
  color: string | null;
  modeBehavior: Partial<Record<ScheduleMode, ModeAction>> | null;
  progression: TimeProgression | null;
  notes: string | null;
  reminders: ActivityReminderPresets;
}

export interface ScheduleTemplate {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  activityCount: number;
  updatedAt: string;
}

export interface ReminderItem {
  id: string;
  kind: ReminderKind;
  anchor: ReminderAnchor;
  activityId: string | null;
  offsetMinutes: number;
  time: string | null;
  recurrence: Recurrence | null;
  daysBefore: number[] | null;
  title: string | null;
  body: string | null;
  enabled: boolean;
  bypassQuietHours: boolean;
  activity: {
    id: string;
    title: string;
    startTime: string;
    durationMinutes: number;
    category: ActivityCategory;
  } | null;
}

export interface NotificationItem {
  id: string;
  source: 'schedule' | 'snooze' | 'test';
  kind: ReminderKind;
  fireAt: string;
  title: string;
  body: string;
  url: string;
  status:
    | 'pending'
    | 'processing'
    | 'sent'
    | 'failed'
    | 'cancelled'
    | 'suppressed'
    | 'skipped_condition'
    | 'expired'
    | 'no_subscription';
  statusReason: string | null;
  sentAt: string | null;
  deliveredAt: string | null;
  clickedAt: string | null;
  activityId: string | null;
  occurrenceDate: string | null;
}

export interface PushDevice {
  id: string;
  platform: 'ios' | 'android' | 'desktop' | 'unknown';
  deviceLabel: string | null;
  pushService: string;
  createdAt: string;
  lastSuccessAt: string | null;
  lastFailureAt: string | null;
}

export interface TemplateSummary {
  key: OnboardingAnswers['templateKey'];
  title: string;
  tagline: string;
  goalType: string;
  durationMonths: number;
  tracks: Array<{ ref: string; title: string; kind: string; topicCount: number }>;
}

export type { NotificationPrefsInput };
