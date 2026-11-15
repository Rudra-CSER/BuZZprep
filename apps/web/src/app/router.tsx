import { createBrowserRouter } from 'react-router';
import { LoginPage } from '@/features/auth/LoginPage';
import { RegisterPage } from '@/features/auth/RegisterPage';
import { DashboardPage } from '@/features/dashboard/DashboardPage';
import { SchedulePage } from '@/features/schedule/SchedulePage';
import { AppShell } from './AppShell';
import { NotFoundPage } from './NotFoundPage';
import { RequireAuth } from './RequireAuth';

const lazy =
  <T extends Record<string, unknown>>(load: () => Promise<T>, name: keyof T) =>
  async () => ({
    Component: (await load())[name] as React.ComponentType,
  });

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  { path: '/register', element: <RegisterPage /> },
  {
    element: <RequireAuth />,
    children: [
      {
        path: '/onboarding',
        lazy: lazy(() => import('@/features/onboarding/OnboardingPage'), 'OnboardingPage'),
      },
      {
        element: <AppShell />,
        children: [
          { index: true, element: <DashboardPage /> },
          { path: 'schedule', element: <SchedulePage /> },
          {
            path: 'schedule/review',
            lazy: lazy(() => import('@/features/schedule/ReviewPage'), 'ReviewPage'),
          },
          {
            path: 'schedule/routine',
            lazy: lazy(() => import('@/features/schedule/RoutinePage'), 'RoutinePage'),
          },
          {
            path: 'schedule/occurrence/:activityId/:date',
            lazy: lazy(() => import('@/features/schedule/OccurrencePage'), 'OccurrencePage'),
          },
          {
            path: 'focus/:activityId/:date',
            lazy: lazy(() => import('@/features/schedule/FocusPage'), 'FocusPage'),
          },
          { path: 'learn', lazy: lazy(() => import('@/features/learn/LearnPage'), 'LearnPage') },
          {
            path: 'journal',
            lazy: lazy(() => import('@/features/journal/JournalPage'), 'JournalPage'),
          },
          {
            path: 'profile',
            lazy: lazy(() => import('@/features/profile/ProfilePage'), 'ProfilePage'),
          },
          {
            path: 'profile/notifications',
            lazy: lazy(
              () => import('@/features/notifications/NotificationsPage'),
              'NotificationsPage',
            ),
          },
          {
            path: 'profile/plan',
            lazy: lazy(() => import('@/features/profile/PlanPage'), 'PlanPage'),
          },
          {
            path: 'install',
            lazy: lazy(() => import('@/features/notifications/InstallPage'), 'InstallPage'),
          },
          { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
  },
]);
