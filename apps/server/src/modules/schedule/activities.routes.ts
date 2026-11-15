import { activityCreateSchema, activityUpdateSchema } from '@buzzprep/shared';
import { Router } from 'express';
import type { AppContext } from '../../context';
import { parseId } from '../../lib/params';
import { auth, requireAuth } from '../../middleware/auth';
import {
  archiveActivity,
  createActivity,
  getActivity,
  listActivities,
  updateActivity,
} from './activities.service';

/** /api/v1/activities — the recurring items of a routine. */
export function activitiesRouter(ctx: AppContext): Router {
  const r = Router();
  r.use(requireAuth);

  r.get('/', async (req, res) => {
    const scheduleId =
      typeof req.query.scheduleId === 'string'
        ? parseId(req.query.scheduleId, 'Schedule')
        : undefined;
    res.json({ activities: await listActivities(auth(req).userId, scheduleId) });
  });

  r.get('/:id', async (req, res) => {
    res.json({ activity: await getActivity(auth(req).userId, parseId(req.params.id, 'Activity')) });
  });

  r.post('/', async (req, res) => {
    const { userId } = auth(req);
    const activity = await createActivity(userId, activityCreateSchema.parse(req.body));
    ctx.notifications.queueReconcile(userId);
    res.status(201).json({ activity });
  });

  r.patch('/:id', async (req, res) => {
    const { userId } = auth(req);
    const id = parseId(req.params.id, 'Activity');
    const activity = await updateActivity(userId, id, activityUpdateSchema.parse(req.body));
    ctx.notifications.queueReconcile(userId);
    res.json({ activity });
  });

  r.delete('/:id', async (req, res) => {
    const { userId } = auth(req);
    await archiveActivity(userId, parseId(req.params.id, 'Activity'));
    ctx.notifications.queueReconcile(userId);
    res.json({ ok: true });
  });

  return r;
}
