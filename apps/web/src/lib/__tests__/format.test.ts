import { describe, expect, it } from 'vitest';
import { hoursLabel, occurrenceRange, relativeDay, relativeMinutes } from '../format';

describe('formatting', () => {
  it('formats ranges that cross midnight', () => {
    expect(occurrenceRange({ startTime: '01:15', durationMinutes: 450 })).toBe('1:15 AM – 8:45 AM');
    expect(occurrenceRange({ startTime: '21:30', durationMinutes: 195 })).toBe(
      '9:30 PM – 12:45 AM',
    );
    expect(occurrenceRange({ startTime: '19:00', durationMinutes: 70 }, false)).toBe(
      '19:00 – 20:10',
    );
    expect(occurrenceRange({ startTime: '08:45', durationMinutes: 0 })).toBe('8:45 AM');
  });

  it('names nearby days', () => {
    expect(relativeDay('2026-11-13', '2026-11-13')).toBe('Today');
    expect(relativeDay('2026-11-14', '2026-11-13')).toBe('Tomorrow');
    expect(relativeDay('2026-11-12', '2026-11-13')).toBe('Yesterday');
    expect(relativeDay('2026-11-20', '2026-11-13')).toBe('Fri 20 Nov');
  });

  it('formats durations for humans', () => {
    expect(relativeMinutes(135)).toBe('in 2h 15m');
    expect(relativeMinutes(-5)).toBe('5m ago');
    expect(hoursLabel(45)).toBe('45m');
    expect(hoursLabel(750)).toBe('12.5h');
  });
});
