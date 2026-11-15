import { profilePatchSchema } from '@buzzprep/shared';
import { Router } from 'express';
import type { AppContext } from '../../context';
import { auth, requireAuth } from '../../middleware/auth';
import { getProfile, publicProfile, updateProfile } from './profile.service';

/** /api/v1/profile */
export function profileRouter(ctx: AppContext): Router {
  const r = Router();
  r.use(requireAuth);

  r.get('/', async (req, res) => {
    res.json({ profile: publicProfile(await getProfile(auth(req).userId)) });
  });

  r.patch('/', async (req, res) => {
    const { userId } = auth(req);
    const patch = profilePatchSchema.parse(req.body);
    const { profile, affectsReminders } = await updateProfile(userId, patch);
    if (affectsReminders) ctx.notifications.queueReconcile(userId);
    res.json({ profile: publicProfile(profile) });
  });

  return r;
}
