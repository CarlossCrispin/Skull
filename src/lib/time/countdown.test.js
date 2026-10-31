import { describe, expect, it } from 'vitest';
import { countdownAt, formatCountdown, MEXICO_CITY_OFFSET_MS, nextTargetMs, pad2 } from './countdown.js';

// Mexico City is UTC-6 all year since 2022, so local midnight is 06:00 UTC.
const at = (year, month, day, hour = 0, minute = 0, second = 0) =>
  Date.UTC(year, month - 1, day, hour + 6, minute, second);

describe('pad2', () => {
  it('pads to two digits and keeps longer numbers', () => {
    expect(pad2(0)).toBe('00');
    expect(pad2(7)).toBe('07');
    expect(pad2(42)).toBe('42');
    expect(pad2(123)).toBe('123');
  });
});

describe('nextTargetMs', () => {
  it('targets 1 November 00:00 Mexico City, the start of the festivity, of the current year', () => {
    expect(MEXICO_CITY_OFFSET_MS).toBe(6 * 3600 * 1000);
    expect(nextTargetMs(at(2026, 1, 15))).toBe(at(2026, 11, 1));
    expect(nextTargetMs(at(2026, 10, 31, 23, 59, 59))).toBe(at(2026, 11, 1));
  });

  it('rolls over to the next year after 2 November', () => {
    expect(nextTargetMs(at(2026, 11, 3))).toBe(at(2027, 11, 1));
    expect(nextTargetMs(at(2026, 12, 31, 23, 59, 59))).toBe(at(2027, 11, 1));
  });

  it('uses the Mexico City date, not the UTC date', () => {
    // 1 Jan 2027 03:00 UTC is still 31 Dec 2026 21:00 in Mexico City.
    expect(nextTargetMs(Date.UTC(2027, 0, 1, 3))).toBe(at(2027, 11, 1));
  });
});

describe('countdownAt', () => {
  it('breaks the remaining time into days, hours, minutes and seconds', () => {
    const now = at(2026, 10, 29, 22, 58, 55);
    expect(countdownAt(now)).toEqual({ today: false, days: 2, hours: 1, minutes: 1, seconds: 5 });
  });

  it('reaches the last second on 31 October, right before HOY', () => {
    expect(countdownAt(at(2026, 10, 31, 23, 59, 59))).toEqual({ today: false, days: 0, hours: 0, minutes: 0, seconds: 1 });
  });

  it('shows today on 1 and 2 November in Mexico City, boundaries included', () => {
    expect(countdownAt(at(2026, 11, 1, 0, 0, 0))).toEqual({ today: true });
    expect(countdownAt(at(2026, 11, 1, 12))).toEqual({ today: true });
    expect(countdownAt(at(2026, 11, 2, 23, 59, 59))).toEqual({ today: true });
  });

  it('stops being today at 3 November 00:00 and counts to the next year', () => {
    const state = countdownAt(at(2026, 11, 3, 0, 0, 0));
    expect(state.today).toBe(false);
    expect(state.days).toBe(363);
    expect(state.hours).toBe(0);
  });

  it('uses the Mexico City date at the UTC day boundary', () => {
    // 2 Nov 2026 05:59:59 UTC is 1 Nov 23:59:59 in Mexico City: today.
    expect(countdownAt(Date.UTC(2026, 10, 2, 5, 59, 59))).toEqual({ today: true });
    // 3 Nov 2026 05:59:59 UTC is still 2 Nov in Mexico City: today.
    expect(countdownAt(Date.UTC(2026, 10, 3, 5, 59, 59))).toEqual({ today: true });
    expect(countdownAt(Date.UTC(2026, 10, 3, 6, 0, 0)).today).toBe(false);
  });
});

describe('formatCountdown', () => {
  it('formats DD:HH:MM:SS with padding', () => {
    expect(formatCountdown({ today: false, days: 3, hours: 1, minutes: 1, seconds: 5 })).toBe('03:01:01:05');
    expect(formatCountdown({ today: false, days: 364, hours: 23, minutes: 59, seconds: 59 })).toBe('364:23:59:59');
  });

  it('formats the today state as HOY', () => {
    expect(formatCountdown({ today: true })).toBe('HOY');
  });
});
