import { notificationEventSchema, snoozeSchema } from '@buzzprep/shared';
import { Router } from 'express';
import { z } from 'zod';
import type { AppContext } from '../../context';
import { parseId } from '../../lib/params';
import { auth, requireAuth } from '../../middleware/auth';
import {
  findUserNotification,
  listRecentNotifications,
  listUpcomingNotifications,
  skipNotification,
} from './notification-log.service';

const limitQuery = (max: number, fallback: number) =>
  z.object({ limit: z.coerce.number().int().min(1).max(max).default(fallback) });

/** /api/v1/notifications — delivery history, what's next, snooze and skip. */
export function notificationsRouter({ notifications }: AppContext): Router {
  const r = Router();

  /**
   * Service-worker receipts and actions. Authorised by the session cookie when present,
   * otherwise by the signed per-notification token from the push payload.
   */
  r.post('/:id/events', async (req, res) => {
    const input = notificationEventSchema.parse(req.body);
    res.json(await notifications.handleEvent(String(req.params.id), input, req.auth?.userId));
  });

  r.use(requireAuth);

  r.get('/', async (req, res) => {
    const { limit } = limitQuery(100, 50).parse(req.query);
    res.json({ notifications: await listRecentNotifications(auth(req).userId, limit) });
  });

  r.get('/upcoming', async (req, res) => {
    const { limit } = limitQuery(50, 10).parse(req.query);
    res.json({ notifications: await listUpcomingNotifications(auth(req).userId, limit) });
  });

  r.post('/:id/snooze', async (req, res) => {
    const { userId } = auth(req);
    const { minutes } = snoozeSchema.parse(req.body);
    const n = await findUserNotification(userId, parseId(req.params.id, 'Notification'));
    const snoozed = await notifications.snooze(n, minutes);
    res.json({ snoozedUntil: snoozed.fireAt.toISOString() });
  });

  r.post('/:id/skip', async (req, res) => {
    await skipNotification(auth(req).userId, parseId(req.params.id, 'Notification'));
    res.json({ ok: true });
  });

  return r;
}
