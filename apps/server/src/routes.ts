import express, { Router, type RequestHandler } from 'express';
import type { AppContext } from './context';
import { loadSession } from './middleware/auth';
import { originGuard } from './middleware/csrf';
import { notFoundHandler } from './middleware/error-handler';
import { apiLimiter } from './middleware/rate-limit';
import { accountRouter } from './modules/account/account.routes';
import { authRouter } from './modules/auth/auth.routes';
import { configRouter } from './modules/config/config.routes';
import { dashboardRouter } from './modules/dashboard/dashboard.routes';
import { journalRouter } from './modules/journal/journal.routes';
import { metaRouter } from './modules/meta/meta.routes';
import { notificationsRouter } from './modules/notifications/notifications.routes';
import { pushRouter } from './modules/notifications/push.routes';
import { onboardingRouter } from './modules/onboarding/onboarding.routes';
import { plansRouter } from './modules/plans/plans.routes';
import { profileRouter } from './modules/profile/profile.routes';
import { remindersRouter } from './modules/reminders/reminders.routes';
import { activitiesRouter } from './modules/schedule/activities.routes';
import { agendaRouter } from './modules/schedule/agenda.routes';
import { dayModesRouter } from './modules/schedule/day-modes.routes';
import { occurrencesRouter } from './modules/schedule/occurrences.routes';
import { schedulesRouter } from './modules/schedule/schedules.routes';

const noStore: RequestHandler = (_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  next();
};

/**
 * Every API route, in one place. Mounted at /api by app.ts.
 * Each module router declares its own paths and whether they need a session.
 */
export function createApiRouter(ctx: AppContext): Router {
  const api = Router();
  api.use(express.json({ limit: '1mb' }));
  api.use(apiLimiter);
  api.use(loadSession(ctx.env));
  api.use(originGuard(ctx.env));
  api.use(noStore);

  // Public: /api/health, /api/meta
  api.use(metaRouter(ctx));

  api.use('/v1/auth', authRouter(ctx));
  api.use('/v1/account', accountRouter(ctx));
  api.use('/v1/profile', profileRouter(ctx));
  api.use('/v1/onboarding', onboardingRouter(ctx));
  api.use('/v1/config', configRouter(ctx));
  api.use('/v1/plans', plansRouter(ctx));
  api.use('/v1/dashboard', dashboardRouter(ctx));
  api.use('/v1/journal', journalRouter(ctx));

  // Schedule
  api.use('/v1/schedules', schedulesRouter(ctx));
  api.use('/v1/activities', activitiesRouter(ctx));
  api.use('/v1/agenda', agendaRouter(ctx));
  api.use('/v1/occurrences', occurrencesRouter(ctx));
  api.use('/v1/day-modes', dayModesRouter(ctx));

  // Reminders and delivery
  api.use('/v1/reminders', remindersRouter(ctx));
  api.use('/v1/notifications', notificationsRouter(ctx));
  api.use('/v1/push', pushRouter(ctx));

  api.use(notFoundHandler);
  return api;
}
