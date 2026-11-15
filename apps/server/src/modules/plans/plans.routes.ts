import { milestoneInputSchema, planPatchSchema } from '@buzzprep/shared';
import { Router } from 'express';
import type { AppContext } from '../../context';
import { parseId } from '../../lib/params';
import { auth, requireAuth } from '../../middleware/auth';
import {
  activatePlan,
  addMilestone,
  deleteMilestone,
  getActivePlan,
  listPlans,
  updateMilestone,
  updatePlan,
} from './plans.service';

/** /api/v1/plans — milestone changes re-plan milestone reminders. */
export function plansRouter(ctx: AppContext): Router {
  const r = Router();
  r.use(requireAuth);

  r.get('/', async (req, res) => {
    res.json({ plans: await listPlans(auth(req).userId) });
  });

  r.get('/active', async (req, res) => {
    res.json({ plan: await getActivePlan(auth(req).userId) });
  });

  r.patch('/:id', async (req, res) => {
    const { userId } = auth(req);
    const patch = planPatchSchema.parse(req.body);
    const plan = await updatePlan(userId, parseId(req.params.id, 'Plan'), patch);
    ctx.notifications.queueReconcile(userId);
    res.json({ plan });
  });

  r.post('/:id/activate', async (req, res) => {
    const { userId } = auth(req);
    await activatePlan(userId, parseId(req.params.id, 'Plan'));
    ctx.notifications.queueReconcile(userId);
    res.json({ ok: true });
  });

  r.post('/:id/milestones', async (req, res) => {
    const { userId } = auth(req);
    const input = milestoneInputSchema.parse(req.body);
    const plan = await addMilestone(userId, parseId(req.params.id, 'Plan'), input);
    ctx.notifications.queueReconcile(userId);
    res.status(201).json({ plan });
  });

  r.patch('/:id/milestones/:milestoneId', async (req, res) => {
    const { userId } = auth(req);
    const input = milestoneInputSchema.partial().parse(req.body);
    const plan = await updateMilestone(
      userId,
      parseId(req.params.id, 'Plan'),
      parseId(req.params.milestoneId, 'Milestone'),
      input,
    );
    ctx.notifications.queueReconcile(userId);
    res.json({ plan });
  });

  r.delete('/:id/milestones/:milestoneId', async (req, res) => {
    const { userId } = auth(req);
    const plan = await deleteMilestone(
      userId,
      parseId(req.params.id, 'Plan'),
      parseId(req.params.milestoneId, 'Milestone'),
    );
    ctx.notifications.queueReconcile(userId);
    res.json({ plan });
  });

  return r;
}
