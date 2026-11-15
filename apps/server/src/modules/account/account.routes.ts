import { changePasswordSchema, deleteAccountSchema, updateAccountSchema } from '@buzzprep/shared';
import { Router } from 'express';
import type { AppContext } from '../../context';
import { auth, requireAuth } from '../../middleware/auth';
import { userLimiter } from '../../middleware/rate-limit';
import { clearSessionCookie } from '../auth/session';
import { changePassword, deleteAccount, exportAccountData, updateAccount } from './account.service';

/** /api/v1/account */
export function accountRouter({ env }: AppContext): Router {
  const r = Router();
  r.use(requireAuth);

  r.patch('/', async (req, res) => {
    const input = updateAccountSchema.parse(req.body);
    res.json({ user: await updateAccount(auth(req).userId, input) });
  });

  r.post('/password', userLimiter(5, 15 * 60_000), async (req, res) => {
    const { userId, sessionId } = auth(req);
    await changePassword(userId, sessionId, changePasswordSchema.parse(req.body));
    res.json({ ok: true });
  });

  r.get('/export', userLimiter(5, 10 * 60_000), async (req, res) => {
    const data = await exportAccountData(auth(req).userId);
    const stamp = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Disposition', `attachment; filename="buzzprep-export-${stamp}.json"`);
    res.json(data);
  });

  r.delete('/', userLimiter(3, 15 * 60_000), async (req, res) => {
    const { password } = deleteAccountSchema.parse(req.body);
    await deleteAccount(auth(req).userId, password);
    clearSessionCookie(res, env);
    res.json({ ok: true });
  });

  return r;
}
