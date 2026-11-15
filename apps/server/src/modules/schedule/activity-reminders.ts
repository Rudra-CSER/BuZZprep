import type { ActivityReminderPresets } from '@buzzprep/shared';
import type { Types } from 'mongoose';
import { Reminder, type IReminder } from '../../db/models';

/**
 * The activity editor shows three simple reminder switches ("before", "at start", "if not done").
 * They are stored as ordinary reminder rules attached to the activity.
 */
const PRESET_KINDS = ['upcoming', 'start', 'overdue'] as const;
type PresetKind = (typeof PRESET_KINDS)[number];

interface WantedRule {
  kind: PresetKind;
  anchor: 'activity_start' | 'activity_end';
  offset: number;
}

/** Read the presets back from an activity's reminder rules. */
export function presetsFrom(reminders: IReminder[]): ActivityReminderPresets {
  const upcoming = reminders.find((r) => r.kind === 'upcoming' && r.enabled);
  const start = reminders.find((r) => r.kind === 'start' && r.enabled);
  const overdue = reminders.find((r) => r.kind === 'overdue' && r.enabled);
  return {
    upcomingMinutes: upcoming ? Math.abs(upcoming.offsetMinutes) : null,
    atStart: !!start,
    overdueMinutes: overdue ? overdue.offsetMinutes : null,
  };
}

/** Create, update or remove the activity's preset rules so they match `presets`. */
export async function syncPresets(
  userId: Types.ObjectId,
  activityId: Types.ObjectId,
  presets: ActivityReminderPresets,
): Promise<void> {
  const existing = await Reminder.find({ userId, activityId, kind: { $in: PRESET_KINDS } }).lean<
    IReminder[]
  >();
  const wanted: Array<WantedRule | null> = [
    presets.upcomingMinutes
      ? { kind: 'upcoming', anchor: 'activity_start', offset: -presets.upcomingMinutes }
      : null,
    presets.atStart ? { kind: 'start', anchor: 'activity_start', offset: 0 } : null,
    presets.overdueMinutes
      ? { kind: 'overdue', anchor: 'activity_end', offset: presets.overdueMinutes }
      : null,
  ];
  for (const kind of PRESET_KINDS) {
    const want = wanted.find((w) => w?.kind === kind) ?? null;
    const have = existing.find((r) => r.kind === kind);
    if (want && have) {
      await Reminder.updateOne(
        { _id: have._id },
        { $set: { offsetMinutes: want.offset, enabled: true, anchor: want.anchor } },
      );
    } else if (want) {
      await Reminder.create({
        userId,
        activityId,
        kind,
        anchor: want.anchor,
        offsetMinutes: want.offset,
      });
    } else if (have) {
      await Reminder.deleteMany({ userId, activityId, kind });
    }
  }
}
