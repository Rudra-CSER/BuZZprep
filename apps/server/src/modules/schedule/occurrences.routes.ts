import { occurrenceUpdateSchema, postponeSchema, rescheduleSchema } from '@buzzprep/shared';
import { Router, type Request } from 'express';
import type { AppContext } from '../../context';
import { parseDate, parseId } from '../../lib/params';
import { auth, requireAuth } from '../../middleware/auth';
import {
  clearOverride,
  getOccurrence,
  getOccurrenceDetail,
  listNeedingDecision,
  postponeOccurrence,
  rescheduleOccurrence,
  suggestFreeSlots,
  updateOccurrence,
} from './occurrences.service';

/** `:activityId/:date` identifies a session by its activity and original date. */
function sessionKey(req: Request) {
  return {
    activityId: parseId(req.params.activityId, 'Activity'),
    date: parseDate(req.params.date),
  };
}

/** /api/v1/occurrences — single sessions: check in, move, find a free slot. */
export function occurrencesRouter(ctx: AppContext): Router {
  const r = Router();
  r.use(requireAuth);

  r.get('/review', async (req, res) => {
    res.json(await listNeedingDecision(auth(req).userId));
  });

  r.get('/:activityId/:date', async (req, res) => {
    const { activityId, date } = sessionKey(req);
    res.json(await getOccurrenceDetail(auth(req).userId, activityId, date));
  });

  r.patch('/:activityId/:date', async (req, res) => {
    const { userId } = auth(req);
    const { activityId, date } = sessionKey(req);
    await updateOccurrence(userId, activityId, date, occurrenceUpdateSchema.parse(req.body));
    ctx.notifications.queueReconcile(userId);
    res.json({ occurrence: await getOccurrence(userId, activityId, date) });
  });

  r.post('/:activityId/:date/reschedule', async (req, res) => {
    const { userId } = auth(req);
    const input = rescheduleSchema.parse(req.body);
    const { activityId, date } = sessionKey(req);
    const result = await rescheduleOccurrence(userId, activityId, date, input);
    ctx.notifications.queueReconcile(userId);
    res.json(result);
  });

  r.post('/:activityId/:date/postpone', async (req, res) => {
    const { userId } = auth(req);
    const { minutes } = postponeSchema.parse(req.body);
    const { activityId, date } = sessionKey(req);
    const result = await postponeOccurrence(userId, activityId, date, minutes);
    ctx.notifications.queueReconcile(userId);
    res.json(result);
  });

  r.delete('/:activityId/:date/override', async (req, res) => {
    const { userId } = auth(req);
    const { activityId, date } = sessionKey(req);
    const occurrence = await clearOverride(userId, activityId, date);
    ctx.notifications.queueReconcile(userId);
    res.json({ occurrence });
  });

  r.get('/:activityId/:date/suggestions', async (req, res) => {
    const { activityId, date } = sessionKey(req);
    res.json({ suggestions: await suggestFreeSlots(auth(req).userId, activityId, date) });
  });

  return r;
}
