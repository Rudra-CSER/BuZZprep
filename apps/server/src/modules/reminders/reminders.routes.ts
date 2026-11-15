import { reminderInputSchema, reminderPatchSchema } from '@buzzprep/shared';
import { Router } from 'express';
import type { AppContext } from '../../context';
import { parseId } from '../../lib/params';
import { auth, requireAuth } from '../../middleware/auth';
import { createReminder, deleteReminder, listReminders, updateReminder } from './reminders.service';

/** /api/v1/reminders — every change re-plans the user's notifications. */
export function remindersRouter(ctx: AppContext): Router {
  const r = Router();
  r.use(requireAuth);

  r.get('/', async (req, res) => {
    res.json({ reminders: await listReminders(auth(req).userId) });
  });

  r.post('/', async (req, res) => {
    const { userId } = auth(req);
    const reminder = await createReminder(userId, reminderInputSchema.parse(req.body));
    ctx.notifications.queueReconcile(userId);
    res.status(201).json({ reminder });
  });

  r.patch('/:id', async (req, res) => {
    const { userId } = auth(req);
    const patch = reminderPatchSchema.parse(req.body);
    const reminder = await updateReminder(userId, parseId(req.params.id, 'Reminder'), patch);
    ctx.notifications.queueReconcile(userId);
    res.json({ reminder });
  });

  r.delete('/:id', async (req, res) => {
    const { userId } = auth(req);
    await deleteReminder(userId, parseId(req.params.id, 'Reminder'));
    ctx.notifications.queueReconcile(userId);
    res.json({ ok: true });
  });

  return r;
}
