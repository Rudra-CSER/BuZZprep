import { describe, expect, it } from 'vitest';
import {
  addDays,
  diffDays,
  formatTime,
  formatTimeLabel,
  isLocalDate,
  isLocalTime,
  isoWeekday,
  isValidZone,
  logicalDateOf,
  logicalDateTime,
  minutesBetween,
  parseTime,
  startOfWeek,
  toLogicalMinutes,
  zonedDateTime,
} from '../src/time';
import { IST, NY } from './fixtures';

describe('wall-clock time helpers', () => {
  it('parses and formats HH:mm', () => {
    expect(parseTime('00:00')).toBe(0);
    expect(parseTime('19:05')).toBe(1145);
    expect(formatTime(1145)).toBe('19:05');
    expect(formatTime(-15)).toBe('23:45');
    expect(formatTime(1440 + 75)).toBe('01:15');
  });

  it('rejects malformed values', () => {
    expect(() => parseTime('24:00')).toThrow();
    expect(() => parseTime('7:00')).toThrow();
    expect(isLocalTime('23:59')).toBe(true);
    expect(isLocalTime('23:60')).toBe(false);
    expect(isLocalDate('2026-02-29')).toBe(false);
    expect(isLocalDate('2028-02-29')).toBe(true);
    expect(isValidZone('Asia/Kolkata')).toBe(true);
    expect(isValidZone('Mars/Olympus')).toBe(false);
  });

  it('measures durations across midnight', () => {
    expect(minutesBetween('01:15', '08:45')).toBe(450);
    expect(minutesBetween('23:00', '01:00')).toBe(120);
    expect(minutesBetween('09:00', '09:00')).toBe(0);
  });

  it('orders times within a logical day that starts at 04:00', () => {
    expect(toLogicalMinutes('04:00', 240)).toBe(0);
    expect(toLogicalMinutes('03:59', 240)).toBe(1439);
    expect(toLogicalMinutes('01:15', 240)).toBeGreaterThan(toLogicalMinutes('21:30', 240));
  });

  it('formats 12h labels', () => {
    expect(formatTimeLabel('00:45')).toBe('12:45 AM');
    expect(formatTimeLabel('12:00')).toBe('12:00 PM');
    expect(formatTimeLabel('19:00')).toBe('7:00 PM');
    expect(formatTimeLabel('19:00', false)).toBe('19:00');
  });
});

describe('calendar dates', () => {
  it('adds and diffs days across month and year boundaries', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2027-03-01', -1)).toBe('2027-02-28');
    expect(diffDays('2026-11-13', '2027-05-15')).toBe(183);
  });

  it('knows weekdays and week starts', () => {
    expect(isoWeekday('2026-11-13')).toBe(5); // Friday
    expect(startOfWeek('2026-11-13')).toBe('2026-11-09');
    expect(startOfWeek('2026-11-09')).toBe('2026-11-09');
    expect(startOfWeek('2026-11-15', 7)).toBe('2026-11-15');
  });
});

describe('logical days and timezones', () => {
  it('puts a 01:15 bedtime on the next calendar day of the same logical day', () => {
    const dt = logicalDateTime('2026-11-13', '01:15', IST);
    expect(dt.toISO()).toBe('2026-11-14T01:15:00.000+05:30');
    expect(dt.toUTC().toISO()).toBe('2026-11-13T19:45:00.000Z');
  });

  it('maps instants back to their logical date', () => {
    expect(logicalDateOf('2026-11-14T01:15:00+05:30', IST)).toBe('2026-11-13');
    expect(logicalDateOf('2026-11-14T03:59:00+05:30', IST)).toBe('2026-11-13');
    expect(logicalDateOf('2026-11-14T04:00:00+05:30', IST)).toBe('2026-11-14');
    // Same instant, different user timezone → different logical day.
    expect(logicalDateOf('2026-11-13T19:45:00Z', { zone: 'UTC', dayBoundaryMinutes: 240 })).toBe(
      '2026-11-13',
    );
  });

  it('is DST-safe (US spring-forward on 2026-03-08)', () => {
    // 04:00 local on the DST day is still that logical day.
    expect(logicalDateOf('2026-03-08T04:00:00-04:00', NY)).toBe('2026-03-08');
    expect(logicalDateOf('2026-03-08T03:30:00-04:00', NY)).toBe('2026-03-07');
    // A wall-clock time inside the DST gap resolves to a valid instant, never throws.
    const gap = zonedDateTime('2026-03-08', 150, 'America/New_York');
    expect(gap.isValid).toBe(true);
    expect(gap.hour).toBe(3);
    // 19:00 stays 19:00 local on both sides of the transition.
    expect(logicalDateTime('2026-03-07', '19:00', NY).toUTC().hour).toBe(0);
    expect(logicalDateTime('2026-03-08', '19:00', NY).toUTC().hour).toBe(23);
  });
});
