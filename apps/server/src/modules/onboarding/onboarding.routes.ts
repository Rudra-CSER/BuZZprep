import { Router } from 'express';
import { z } from 'zod';
import type { AppContext } from '../../context';
import { auth, requireAuth } from '../../middleware/auth';
import {
  completeOnboarding,
  getSavedAnswers,
  getTemplateDefaults,
  listTemplates,
  previewOnboarding,
} from './onboarding.service';

/** /api/v1/onboarding — the setup wizard. */
export function onboardingRouter(ctx: AppContext): Router {
  const r = Router();
  r.use(requireAuth);

  r.get('/templates', (_req, res) => {
    res.json({ templates: listTemplates() });
  });

  r.get('/templates/:key/defaults', async (req, res) => {
    const answers = await getTemplateDefaults(auth(req).userId, String(req.params.key), {
      timezone: req.query.timezone,
      today: req.query.today,
    });
    res.json({ answers });
  });

  r.get('/answers', async (req, res) => {
    res.json({ answers: await getSavedAnswers(auth(req).userId) });
  });

  r.post('/complete', async (req, res) => {
    const { userId } = auth(req);
    const { answers } = z.object({ answers: z.unknown() }).parse(req.body);
    const { summary, week } = await completeOnboarding(userId, answers);
    ctx.notifications.queueReconcile(userId, 100);
    res.json({ ok: true, summary, week });
  });

  r.post('/preview', (req, res) => {
    res.json(previewOnboarding(req.body?.answers));
  });

  return r;
}
