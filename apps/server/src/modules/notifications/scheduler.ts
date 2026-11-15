import type { Env } from '../../config/env';
import { logger } from '../../lib/logger';
import type { NotificationService } from './notification.service';

/**
 * Server-side loop (never the browser): dispatch due notifications every few seconds and
 * re-plan the rolling window periodically. Each step is guarded against overlap; the outbox
 * claim is atomic, so running several workers is safe.
 */
export function startScheduler(service: NotificationService, env: Env): () => void {
  let dispatching = false;
  let reconciling = false;

  const dispatch = async () => {
    if (dispatching) return;
    dispatching = true;
    try {
      const n = await service.dispatchDue(new Date());
      if (n > 0) logger.debug({ processed: n }, 'Dispatched notifications');
    } catch (err) {
      logger.error({ err }, 'Dispatch tick failed');
    } finally {
      dispatching = false;
    }
  };

  const reconcile = async () => {
    if (reconciling) return;
    reconciling = true;
    try {
      const users = await service.reconcileAll();
      logger.debug({ users }, 'Reconciled notification windows');
    } catch (err) {
      logger.error({ err }, 'Reconcile tick failed');
    } finally {
      reconciling = false;
    }
  };

  const dispatchTimer = setInterval(dispatch, env.SCHEDULER_TICK_SECONDS * 1000);
  const reconcileTimer = setInterval(reconcile, env.RECONCILE_INTERVAL_MINUTES * 60_000);
  void reconcile().then(dispatch);
  logger.info(
    { tickSeconds: env.SCHEDULER_TICK_SECONDS, reconcileMinutes: env.RECONCILE_INTERVAL_MINUTES },
    'Notification scheduler started',
  );

  return () => {
    clearInterval(dispatchTimer);
    clearInterval(reconcileTimer);
  };
}
