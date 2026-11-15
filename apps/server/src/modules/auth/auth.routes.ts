import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
} from '@buzzprep/shared';
import { Router } from 'express';
import type { AppContext } from '../../context';
import { auth, requireAuth } from '../../middleware/auth';
import { logger } from '../../lib/logger';
import { authLimiter } from '../../middleware/rate-limit';
import { getProfile } from '../profile/profile.service';
import { authenticate, getCurrentUser, publicUser, registerUser } from './auth.service';
import { requestPasswordReset, resetPassword } from './password-reset.service';
import { clearSessionCookie, createSession, deleteSession } from './session';

/** /api/v1/auth */
export function authRouter({ env, mailer }: AppContext): Router {
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

  // Forgot password: answer at once, and the same for every address; the lookup and the email
  // happen afterwards, so neither the answer nor its timing shows who has an account.
  r.post('/password/forgot', authLimiter, async (req, res) => {
    const { email } = forgotPasswordSchema.parse(req.body);
    void requestPasswordReset(email, env, mailer).catch((err: unknown) =>
      logger.error({ err }, 'Could not send a password reset email'),
    );
    res.status(202).json({ ok: true });
  });

  // Set a new password with a reset link's token, then sign in on this device.
  r.patch('/password', authLimiter, async (req, res) => {
    const input = resetPasswordSchema.parse(req.body);
    const user = await resetPassword(input);
    await createSession(req, res, env, user._id);
    const profile = await getProfile(user._id);
    res.json({ user: publicUser(user), onboardingCompleted: !!profile.onboardingCompletedAt });
  });

  r.get('/me', requireAuth, async (req, res) => {
    res.json(await getCurrentUser(auth(req).userId));
  });

  return r;
}
