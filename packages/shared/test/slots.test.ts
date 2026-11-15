import { describe, expect, it } from 'vitest';
import { expandAgenda, freeGaps, mergeIntervals, suggestSlots } from '../src/schedule';
import { addDays } from '../src/time';
import { eveningRoutine, IST } from './fixtures';

const FRI = '2026-11-13';

function agendaAround(date: string) {
  return expandAgenda({
    activities: eveningRoutine(),
    from: addDays(date, -1),
    to: addDays(date, 3),
    ctx: IST,
  });
}

describe('interval helpers', () => {
  it('merges overlapping intervals and finds gaps', () => {
    expect(
      mergeIntervals([
        { start: 5, end: 10 },
        { start: 0, end: 6 },
        { start: 12, end: 14 },
      ]),
    ).toEqual([
      { start: 0, end: 10 },
      { start: 12, end: 14 },
    ]);
    const minute = 60_000;
    expect(freeGaps([{ start: 10 * minute, end: 20 * minute }], 0, 60 * minute, 15)).toEqual([
      { start: 20 * minute, end: 60 * minute },
    ]);
  });
});

describe('suggestSlots', () => {
  const agenda = agendaAround(FRI);
  const missed = agenda.find((o) => o.activityId === 'main' && o.date === FRI)!;

  it('offers free time (including flexible personal time) and never overlaps blocking activities', () => {
    const now = Date.parse('2026-11-13T16:10:00Z'); // 21:40 IST
    const slots = suggestSlots({ target: missed, agenda, now, ctx: IST });
    expect(slots.length).toBeGreaterThan(0);
    expect(slots[0]).toMatchObject({ date: FRI, startTime: '21:45', reason: 'earliest' });
    expect(slots[0]!.label).toBe('Today · 9:45 PM');

    const blocking = agenda.filter((o) => o.blocking && o.key !== missed.key);
    for (const s of slots) {
      const start = Date.parse(s.start);
      const end = Date.parse(s.end);
      expect(end - start).toBe(70 * 60_000);
      for (const b of blocking) {
        expect(start < Date.parse(b.end) && end > Date.parse(b.start)).toBe(false);
      }
    }
  });

  it('avoids extra ranges such as quiet hours', () => {
    const now = Date.parse('2026-11-13T16:10:00Z');
    const slots = suggestSlots({
      target: missed,
      agenda,
      now,
      ctx: IST,
      avoid: [{ start: '21:00', end: '23:59' }],
    });
    expect(slots.every((s) => !(s.date === FRI && s.startTime >= '21:00'))).toBe(true);
  });

  it('suggests later days when today is full', () => {
    const now = Date.parse('2026-11-13T18:30:00Z'); // 00:00 IST — only 45 min before wind-down
    const slots = suggestSlots({ target: missed, agenda, now, ctx: IST, horizonDays: 3 });
    expect(slots.every((s) => s.date > FRI)).toBe(true);
    expect(slots[0]!.label.startsWith('Tomorrow')).toBe(true);
  });
});
