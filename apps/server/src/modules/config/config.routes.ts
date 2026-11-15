import { configBundleSchema, importModeSchema } from '@buzzprep/shared';
import { Router } from 'express';
import { z } from 'zod';
import type { AppContext } from '../../context';
import { auth, requireAuth } from '../../middleware/auth';
import { userLimiter } from '../../middleware/rate-limit';
import { exportBundle } from './config-export.service';
import { importConfiguration } from './config-import.service';

/** /api/v1/config — configuration bundles (see config/README.md). */
export function configRouter(ctx: AppContext): Router {
  const r = Router();
  r.use(requireAuth);

  r.get('/export', async (req, res) => {
    const bundle = await exportBundle(auth(req).userId);
    const stamp = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Disposition', `attachment; filename="buzzprep-config-${stamp}.json"`);
    res.json(bundle);
  });

  r.post('/import', userLimiter(10, 10 * 60_000), async (req, res) => {
    const { userId } = auth(req);
    const { bundle: raw, ...rest } = z
      .object({ bundle: z.unknown() })
      .passthrough()
      .parse(req.body);
    const { mode } = importModeSchema.parse(rest);
    const summary = await importConfiguration(userId, configBundleSchema.parse(raw), mode);
    ctx.notifications.queueReconcile(userId, 100);
    res.json({ ok: true, summary });
  });

  return r;
}
