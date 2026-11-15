import { Router } from 'express';
import type { AppContext } from '../../context';
import { auth, requireAuth } from '../../middleware/auth';
import { getDashboard } from './dashboard.service';

/** /api/v1/dashboard */
export function dashboardRouter({ notifications }: AppContext): Router {
  const r = Router();
  r.use(requireAuth);

  r.get('/', async (req, res) => {
    res.json(await getDashboard(auth(req).userId, notifications.pushEnabled));
  });

  return r;
}
