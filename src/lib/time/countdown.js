/** Mexico City is UTC-6 all year (no daylight saving since 2022), so a fixed offset is exact. */
export const MEXICO_CITY_OFFSET_MS = 6 * 60 * 60 * 1000;

const SECOND_MS = 1000;
const MINUTE_MS = 60 * SECOND_MS;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

const NOVEMBER = 10; // zero-based month

/**
 * @typedef {{ today: true } | { today: false, days: number, hours: number, minutes: number, seconds: number }} CountdownState
 */

/** Zero-pads to two digits; longer numbers are kept whole. */
export function pad2(value) {
  return String(value).padStart(2, '0');
}

/** Calendar parts of `now` as read on a Mexico City clock. */
function mexicoCityDate(now) {
  const local = new Date(now - MEXICO_CITY_OFFSET_MS);
  return { year: local.getUTCFullYear(), month: local.getUTCMonth(), day: local.getUTCDate() };
}

/** Whether Mexico City is on 1 or 2 November. */
function isFestivityDay({ month, day }) {
  return month === NOVEMBER && (day === 1 || day === 2);
}

/** Instant of 2 November 00:00 in Mexico City of `year`, in epoch ms. */
function targetOfYear(year) {
  return Date.UTC(year, NOVEMBER, 2) + MEXICO_CITY_OFFSET_MS;
}

/**
 * The next 2 November 00:00 (Mexico City) to count down to: this year's until 2 November is over,
 * next year's afterwards.
 *
 * @param {number} now - Epoch ms.
 */
export function nextTargetMs(now) {
  const { year } = mexicoCityDate(now);
  const target = targetOfYear(year);
  const afterFestivity = now >= target + DAY_MS;
  return afterFestivity ? targetOfYear(year + 1) : target;
}

/**
 * The countdown at `now`: `{ today: true }` on 1 and 2 November (Mexico City date), otherwise the
 * remaining days, hours, minutes and seconds to the next 2 November 00:00.
 *
 * @param {number} now - Epoch ms.
 * @returns {CountdownState}
 */
export function countdownAt(now) {
  if (isFestivityDay(mexicoCityDate(now))) {
    return { today: true };
  }
  const remaining = Math.max(0, nextTargetMs(now) - now);
  return {
    today: false,
    days: Math.floor(remaining / DAY_MS),
    hours: Math.floor((remaining % DAY_MS) / HOUR_MS),
    minutes: Math.floor((remaining % HOUR_MS) / MINUTE_MS),
    seconds: Math.floor((remaining % MINUTE_MS) / SECOND_MS),
  };
}

/** `DD:HH:MM:SS`, or `HOY` on the festivity days. @param {CountdownState} state */
export function formatCountdown(state) {
  if (state.today) {
    return 'HOY';
  }
  return [state.days, state.hours, state.minutes, state.seconds].map(pad2).join(':');
}
