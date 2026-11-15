import { describe, expect, it } from 'vitest';
import { describeRecurrence, nextOccurrenceDate, occursOn, type Recurrence } from '../src/time';
import { recurrenceSchema } from '../src/schemas/schedule';

describe('occursOn', () => {
  it('handles one-off dates', () => {
    const r: Recurrence = { freq: 'once', date: '2026-11-20' };
    expect(occursOn(r, '2026-11-20')).toBe(true);
    expect(occursOn(r, '2026-11-21')).toBe(false);
  });

  it('handles daily intervals, start and end dates', () => {
    const r: Recurrence = {
      freq: 'daily',
      interval: 2,
      startDate: '2026-11-10',
      endDate: '2026-11-16',
    };
    expect(occursOn(r, '2026-11-09')).toBe(false);
    expect(occursOn(r, '2026-11-10')).toBe(true);
    expect(occursOn(r, '2026-11-11')).toBe(false);
    expect(occursOn(r, '2026-11-16')).toBe(true);
    expect(occursOn(r, '2026-11-18')).toBe(false);
  });

  it('handles weekly days and every-other-week', () => {
    const mwf: Recurrence = {
      freq: 'weekly',
      interval: 1,
      byWeekday: [1, 3, 5],
      startDate: '2026-11-02',
    };
    expect(occursOn(mwf, '2026-11-13')).toBe(true); // Fri
    expect(occursOn(mwf, '2026-11-14')).toBe(false); // Sat
    const biweekly: Recurrence = {
      freq: 'weekly',
      interval: 2,
      byWeekday: [6],
      startDate: '2026-11-04',
    };
    expect(occursOn(biweekly, '2026-11-07')).toBe(true);
    expect(occursOn(biweekly, '2026-11-14')).toBe(false);
    expect(occursOn(biweekly, '2026-11-21')).toBe(true);
  });

  it('handles monthly days including "last day"', () => {
    const r: Recurrence = {
      freq: 'monthly',
      interval: 1,
      byMonthDay: [-1, 15],
      startDate: '2026-11-01',
    };
    expect(occursOn(r, '2027-02-28')).toBe(true);
    expect(occursOn(r, '2027-02-15')).toBe(true);
    expect(occursOn(r, '2027-02-27')).toBe(false);
    const quarterly: Recurrence = {
      freq: 'monthly',
      interval: 3,
      byMonthDay: [1],
      startDate: '2026-11-01',
    };
    expect(occursOn(quarterly, '2027-02-01')).toBe(true);
    expect(occursOn(quarterly, '2027-01-01')).toBe(false);
  });
});

describe('recurrence helpers', () => {
  it('finds the next occurrence', () => {
    const r: Recurrence = { freq: 'weekly', interval: 1, byWeekday: [7], startDate: '2026-11-01' };
    expect(nextOccurrenceDate(r, '2026-11-13')).toBe('2026-11-15');
    expect(nextOccurrenceDate({ freq: 'once', date: '2026-11-01' }, '2026-11-13')).toBeNull();
  });

  it('describes rules for humans', () => {
    expect(describeRecurrence({ freq: 'daily', interval: 1, startDate: '2026-11-01' })).toBe(
      'Every day',
    );
    expect(
      describeRecurrence({
        freq: 'weekly',
        interval: 1,
        byWeekday: [5, 1, 2, 3, 4],
        startDate: '2026-11-01',
      }),
    ).toBe('Weekdays');
    expect(
      describeRecurrence({
        freq: 'weekly',
        interval: 1,
        byWeekday: [1, 3, 5],
        startDate: '2026-11-01',
      }),
    ).toBe('Mon, Wed, Fri');
    expect(
      describeRecurrence({
        freq: 'monthly',
        interval: 1,
        byMonthDay: [-1],
        startDate: '2026-11-01',
      }),
    ).toBe('Monthly on the last day');
  });

  it('validates rules', () => {
    expect(
      recurrenceSchema.safeParse({ freq: 'weekly', byWeekday: [], startDate: '2026-11-01' })
        .success,
    ).toBe(false);
    expect(
      recurrenceSchema.safeParse({ freq: 'daily', startDate: '2026-11-10', endDate: '2026-11-01' })
        .success,
    ).toBe(false);
    const parsed = recurrenceSchema.parse({
      freq: 'weekly',
      byWeekday: [5, 1, 1],
      startDate: '2026-11-01',
    });
    expect(parsed).toMatchObject({ interval: 1, byWeekday: [1, 5] });
  });
});
