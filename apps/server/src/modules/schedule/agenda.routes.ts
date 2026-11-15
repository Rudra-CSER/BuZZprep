import { agendaQuerySchema } from '@buzzprep/shared';
import { Router } from 'express';
import type { AppContext } from '../../context';
import { auth, requireAuth } from '../../middleware/auth';
import { getAgendaView } from './agenda.service';

/** /api/v1/agenda — expanded sessions for a date range (at most 62 days). */
export function agendaRouter(_ctx: AppContext): Router {
  const r = Router();
  r.use(requireAuth);

  r.get('/', async (req, res) => {
    const query = agendaQuerySchema.parse(req.query);
    res.json(await getAgendaView(auth(req).userId, query));
  });

  return r;
}
