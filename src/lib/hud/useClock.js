import { useEffect, useState } from 'react';

/** Shown before mount so the first render is stable (no hydration or test flakiness). */
export const CLOCK_PLACEHOLDER = '--.--.---- · --:--:--';

const TICK_MS = 1000;

const formatter = new Intl.DateTimeFormat('es-MX', {
  timeZone: 'America/Mexico_City',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
});

/** `DD.MM.YYYY · HH:MM:SS` in Mexico City time. Built from parts so the locale separators never leak in. */
export function formatMexicoCityTime(date) {
  const parts = Object.fromEntries(formatter.formatToParts(date).map(({ type, value }) => [type, value]));
  return `${parts.day}.${parts.month}.${parts.year} · ${parts.hour}:${parts.minute}:${parts.second}`;
}

/**
 * Live Mexico City clock: `{ text, iso }`. `text` is the placeholder (and `iso` null) until mounted, then
 * updates every second. The interval is cleared on unmount and while the document is hidden; it refreshes
 * at once when the document becomes visible again.
 */
export function useClock() {
  const [clock, setClock] = useState({ text: CLOCK_PLACEHOLDER, iso: null });

  useEffect(() => {
    let timer;
    const tick = () => {
      const now = new Date();
      setClock({ text: formatMexicoCityTime(now), iso: now.toISOString() });
    };
    const stop = () => {
      clearInterval(timer);
      timer = undefined;
    };
    const start = () => {
      if (timer !== undefined) return;
      tick();
      timer = setInterval(tick, TICK_MS);
    };
    const onVisibility = () => {
      if (document.hidden) stop();
      else start();
    };
    if (!document.hidden) start();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      stop();
    };
  }, []);

  return clock;
}
