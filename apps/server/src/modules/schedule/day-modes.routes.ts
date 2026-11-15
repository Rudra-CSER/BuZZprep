import { agendaQuerySchema, dayModeSchema } from '@buzzprep/shared';
import { Router } from 'express';
import type { AppContext } from '../../context';
import { parseDate } from '../../lib/params';
import { auth, requireAuth } from '../../middleware/auth';
import { clearDayMode, loadDayModes, setDayMode } from './day-modes.service';

/** /api/v1/day-modes — Normal, Busy, Low energy or Recovery for a day or a range. */
export function dayModesRouter(ctx: AppContext): Router {
  const r = Router();
  r.use(requireAuth);

  r.get('/', async (req, res) => {
    const { from, to } = agendaQuerySchema.parse(req.query);
    res.json({ dayModes: await loadDayModes(auth(req).userId, from, to) });
  });

  r.put('/:date', async (req, res) => {
    const { userId } = auth(req);
    const date = parseDate(req.params.date);
    const dayModes = await setDayMode(userId, date, dayModeSchema.parse(req.body));
    ctx.notifications.queueReconcile(userId);
    res.json({ dayModes });
  });

  r.delete('/:date', async (req, res) => {
    const { userId } = auth(req);
    await clearDayMode(userId, parseDate(req.params.date));
    ctx.notifications.queueReconcile(userId);
    res.json({ ok: true });
  });

  return r;
}
