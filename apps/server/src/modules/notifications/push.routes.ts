import { pushSubscriptionSchema } from '@buzzprep/shared';
import { Router } from 'express';
import { z } from 'zod';
import type { AppContext } from '../../context';
import { parseId } from '../../lib/params';
import { auth, requireAuth } from '../../middleware/auth';
import { userLimiter } from '../../middleware/rate-limit';
import { publicNotification } from './notification-log.service';
import {
  deleteSubscription,
  listSubscriptions,
  saveSubscription,
  unsubscribeEndpoint,
} from './push-subscription.service';

/** /api/v1/push — devices that receive reminders, and a test push. */
export function pushRouter({ notifications }: AppContext): Router {
  const r = Router();
  r.use(requireAuth);

  /** Only the VAPID public key ever reaches the browser. */
  r.get('/config', (_req, res) => {
    res.json({ enabled: notifications.pushEnabled, publicKey: notifications.publicKey });
  });

  r.get('/subscriptions', async (req, res) => {
    res.json({ subscriptions: await listSubscriptions(auth(req).userId) });
  });

  r.post('/subscriptions', async (req, res) => {
    const { userId } = auth(req);
    const input = pushSubscriptionSchema.parse(req.body);
    const subscription = await saveSubscription(userId, input, req.get('user-agent') ?? '');
    notifications.queueReconcile(userId, 200);
    res.status(201).json({ subscription });
  });

  r.delete('/subscriptions/:id', async (req, res) => {
    await deleteSubscription(auth(req).userId, parseId(req.params.id, 'Subscription'));
    res.json({ ok: true });
  });

  r.post('/unsubscribe', async (req, res) => {
    const { endpoint } = z.object({ endpoint: z.string().max(2048) }).parse(req.body);
    await unsubscribeEndpoint(auth(req).userId, endpoint);
    res.json({ ok: true });
  });

  r.post('/test', userLimiter(5), async (req, res) => {
    const result = await notifications.sendTest(auth(req).userId);
    res.json({
      notification: result ? publicNotification(result) : null,
      results: (result?.results ?? []).map((x) => ({
        subscriptionId: x.subscriptionId?.toHexString(),
        statusCode: x.statusCode,
        error: x.error,
      })),
    });
  });

  return r;
}
