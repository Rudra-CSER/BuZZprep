import { scheduleTemplateInputSchema } from '@buzzprep/shared';
import { Router } from 'express';
import type { AppContext } from '../../context';
import { parseId } from '../../lib/params';
import { auth, requireAuth } from '../../middleware/auth';
import { resetToDefaultSchedule } from '../onboarding/onboarding.service';
import {
  activateSchedule,
  createSchedule,
  deleteSchedule,
  duplicateSchedule,
  listSchedules,
  updateSchedule,
} from './schedules.service';

/** /api/v1/schedules — named routines; one is active at a time. */
export function schedulesRouter(ctx: AppContext): Router {
  const r = Router();
  r.use(requireAuth);

  r.get('/', async (req, res) => {
    res.json({ schedules: await listSchedules(auth(req).userId) });
  });

  r.post('/', async (req, res) => {
    const input = scheduleTemplateInputSchema.parse(req.body);
    res.status(201).json({ schedule: await createSchedule(auth(req).userId, input) });
  });

  /** Regenerate the default routine from the saved setup answers (non-destructive). */
  r.post('/reset', async (req, res) => {
    const { userId } = auth(req);
    const summary = await resetToDefaultSchedule(userId);
    ctx.notifications.queueReconcile(userId);
    res.json({ ok: true, summary });
  });

  r.patch('/:id', async (req, res) => {
    const input = scheduleTemplateInputSchema.partial().parse(req.body);
    const schedule = await updateSchedule(
      auth(req).userId,
      parseId(req.params.id, 'Schedule'),
      input,
    );
    res.json({ schedule });
  });

  r.post('/:id/activate', async (req, res) => {
    const { userId } = auth(req);
    await activateSchedule(userId, parseId(req.params.id, 'Schedule'));
    ctx.notifications.queueReconcile(userId);
    res.json({ ok: true });
  });

  r.post('/:id/duplicate', async (req, res) => {
    const schedule = await duplicateSchedule(auth(req).userId, parseId(req.params.id, 'Schedule'));
    res.status(201).json({ schedule });
  });

  r.delete('/:id', async (req, res) => {
    await deleteSchedule(auth(req).userId, parseId(req.params.id, 'Schedule'));
    res.json({ ok: true });
  });

  return r;
}
