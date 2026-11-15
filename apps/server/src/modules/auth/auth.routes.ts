import { loginSchema, registerSchema } from '@buzzprep/shared';
import { Router } from 'express';
import type { AppContext } from '../../context';
import { auth, requireAuth } from '../../middleware/auth';
import { authLimiter } from '../../middleware/rate-limit';
import { authenticate, getCurrentUser, publicUser, registerUser } from './auth.service';
import { clearSessionCookie, createSession, deleteSession } from './session';

/** /api/v1/auth */
export function authRouter({ env }: AppContext): Router {
  const r = Router();

  r.post('/register', authLimiter, async (req, res) => {
    const input = registerSchema.parse(req.body);
    const user = await registerUser(input, env);
    await createSession(req, res, env, user._id);
    res.status(201).json({ user: publicUser(user), onboardingCompleted: false });
  });

  r.post('/login', authLimiter, async (req, res) => {
    const input = loginSchema.parse(req.body);
    const { user, onboardingCompleted } = await authenticate(input);
    await createSession(req, res, env, user._id);
    res.json({ user: publicUser(user), onboardingCompleted });
  });

  r.post('/logout', async (req, res) => {
    if (req.auth) await deleteSession(req.auth.sessionId);
    clearSessionCookie(res, env);
    res.json({ ok: true });
  });

  r.get('/me', requireAuth, async (req, res) => {
    res.json(await getCurrentUser(auth(req).userId));
  });

  return r;
}
