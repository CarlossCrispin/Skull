import { useEffect, useState } from 'react';
import { GLASS_PERF_SAMPLES, GLASS_PERF_STALL_MS } from '../../lib/glass/constants.ts';
import { shouldDegradeGlass } from '../../lib/glass/glassWindow.ts';

/** Sampling stays armed this long after the last scroll event. */
const SAMPLING_AFTER_SCROLL_MS = 1000;

/**
 * Performance guard for live glass (design Decision 39). While `active` it records
 * `requestAnimationFrame` intervals, but only while the user scrolls (a passive scroll event
 * arms sampling for one second), because that is when the filtered window costs the most.
 * Once enough intervals have a median over the budget it returns true for the rest of the
 * session: there is no re-promotion, to avoid flapping.
 */
export function useGlassPerfGuard(active: boolean): boolean {
  const [degraded, setDegraded] = useState(false);

  useEffect(() => {
    if (!active || degraded) {
      return;
    }
    const intervals: number[] = [];
    let lastScrollAt = Number.NEGATIVE_INFINITY;
    let previous: number | null = null;
    let frameId: number | null = null;

    const tick = (timestamp: number): void => {
      frameId = null;
      if (previous !== null) {
        const interval = timestamp - previous;
        if (interval < GLASS_PERF_STALL_MS) {
          intervals.push(interval);
          if (intervals.length > GLASS_PERF_SAMPLES) {
            intervals.shift();
          }
          if (shouldDegradeGlass(intervals)) {
            setDegraded(true);
            return;
          }
        }
      }
      if (timestamp - lastScrollAt < SAMPLING_AFTER_SCROLL_MS) {
        previous = timestamp;
        frameId = requestAnimationFrame(tick);
      } else {
        previous = null;
      }
    };

    const onScroll = (): void => {
      lastScrollAt = performance.now();
      if (frameId === null) {
        frameId = requestAnimationFrame(tick);
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (frameId !== null) {
        cancelAnimationFrame(frameId);
      }
    };
  }, [active, degraded]);

  return degraded;
}
