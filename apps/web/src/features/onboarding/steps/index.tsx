import { onboardingAnswersSchema } from '@buzzprep/shared';
import type { ReactNode } from 'react';
import type { Answers, Update } from '../types';
import { GoalStep } from './GoalStep';
import { RemindersStep } from './RemindersStep';
import { RestStep } from './RestStep';
import { ReviewStep } from './ReviewStep';
import { SkillStep } from './SkillStep';
import { SleepStep } from './SleepStep';
import { StudyStep } from './StudyStep';
import { TimelineStep } from './TimelineStep';
import { TracksStep } from './TracksStep';
import { WorkStep } from './WorkStep';

export interface WizardStep {
  title: string;
  description: string;
  render: (a: Answers, u: Update) => ReactNode;
  /** Why the user can't continue yet, or null when the step is complete. */
  blocker?: (a: Answers) => string | null;
}

/** The setup wizard, in order. */
export const STEPS: WizardStep[] = [
  {
    title: 'What are you preparing for?',
    description: 'Pick the closest starting point. Everything it creates can be changed later.',
    render: (a, u) => <GoalStep a={a} u={u} />,
    blocker: (a) => (a.goal.title.trim() ? null : 'Give your goal a name'),
  },
  {
    title: 'When do you want to be ready?',
    description: 'Your countdown, milestones and reminders follow this timeline.',
    render: (a, u) => <TimelineStep a={a} u={u} />,
    blocker: (a) => (a.deadline <= a.startDate ? 'Deadline must be after the start' : null),
  },
  {
    title: 'Your working hours',
    description: 'Study sessions and reminders are planned around them.',
    render: (a, u) => <WorkStep a={a} u={u} />,
    blocker: (a) =>
      a.work.enabled && (a.work.days.length === 0 || a.work.start === a.work.end)
        ? 'Check your working days and hours'
        : null,
  },
  {
    title: 'Your sleep',
    description: 'Tell us where you are now and where you want to be.',
    render: (a, u) => <SleepStep a={a} u={u} />,
  },
  {
    title: 'Time for preparation',
    description: 'Be realistic. A plan you can keep beats an ambitious one you abandon.',
    render: (a, u) => <StudyStep a={a} u={u} />,
  },
  {
    title: 'Where are you starting from?',
    description: 'This only sets expectations — nobody grades it.',
    render: (a, u) => <SkillStep a={a} u={u} />,
  },
  {
    title: 'What will you learn?',
    description: 'Each track gets its own topics, progress and revision schedule.',
    render: (a, u) => <TracksStep a={a} u={u} />,
  },
  {
    title: 'Reminders',
    description: 'Choose what may interrupt you. You can fine-tune each reminder later.',
    render: (a, u) => <RemindersStep a={a} u={u} />,
  },
  {
    title: 'Rest and exercise',
    description: 'Rest days have no study sessions. Gym sessions get their own slot.',
    render: (a, u) => <RestStep a={a} u={u} />,
  },
  {
    title: 'Your plan',
    description: 'Here’s the routine buZZprep will start with.',
    render: (a) => <ReviewStep a={a} />,
    blocker: (a) =>
      onboardingAnswersSchema.safeParse(a).success ? null : 'Some answers need attention',
  },
];
