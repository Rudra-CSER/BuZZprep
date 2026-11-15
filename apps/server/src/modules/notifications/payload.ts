import type { PushPayloadData } from '@buzzprep/shared';
import type { Env } from '../../config/env';
import type { INotification } from '../../db/models';
import { signNotificationToken } from '../../lib/crypto';

const ACTIONABLE = new Set(['upcoming', 'start', 'overdue']);

/**
 * Push payload in Declarative Web Push format (W3C Push API, Safari 18.4+ on iOS):
 * - On iOS 18.4+ the OS can display it even if the service worker is killed or slow.
 * - `mutable: true` still dispatches a `push` event to our service worker, which shows the
 *   notification itself (uniform click handling) and acknowledges delivery.
 * - Older browsers simply receive this JSON in the `push` event and the SW renders it.
 */
export function buildPushPayload(
  n: Pick<
    INotification,
    | '_id'
    | 'userId'
    | 'kind'
    | 'title'
    | 'body'
    | 'url'
    | 'tag'
    | 'fireAt'
    | 'activityId'
    | 'occurrenceDate'
  >,
  env: Pick<Env, 'appOrigin' | 'SESSION_SECRET'>,
  snoozeMinutes: number,
) {
  const id = n._id.toHexString();
  const token = signNotificationToken(env.SESSION_SECRET, id, n.userId.toHexString());
  const sep = n.url.includes('?') ? '&' : '?';
  const relative = `${n.url}${sep}n=${id}`;
  const absolute = (extra = '') => `${env.appOrigin}${relative}${extra}`;

  const data: PushPayloadData = {
    notificationId: id,
    kind: n.kind,
    url: relative,
    token,
    activityId: n.activityId ? n.activityId.toHexString() : null,
    occurrenceDate: n.occurrenceDate,
  };

  const actions =
    n.activityId && n.occurrenceDate && ACTIONABLE.has(n.kind)
      ? [
          { action: 'complete', title: 'Mark done', navigate: absolute('&action=complete') },
          {
            action: 'snooze',
            title: `Snooze ${snoozeMinutes} min`,
            navigate: absolute('&action=snooze'),
          },
        ]
      : [];

  return {
    web_push: 8030,
    mutable: true,
    notification: {
      title: n.title,
      body: n.body,
      navigate: absolute(),
      lang: 'en',
      dir: 'ltr',
      silent: false,
      timestamp: n.fireAt.getTime(),
      icon: `${env.appOrigin}/icons/icon-192.png`,
      badge: `${env.appOrigin}/icons/badge-96.png`,
      ...(n.tag ? { tag: n.tag, renotify: true } : {}),
      data,
      ...(actions.length > 0 ? { actions } : {}),
    },
  };
}
