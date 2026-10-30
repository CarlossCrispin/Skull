import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { ASSEMBLY_RANGE_ATTR } from '../../lib/layout/anchors.ts';
import { assemblyTarget, type AssemblyMetrics } from '../../lib/motion/assembly.ts';
import { OPENING_DONE, type OpeningSample } from '../../lib/motion/opening.ts';
import { shouldResizeRenderer } from '../../scene/scatter/layout.ts';
import type { ScrollFrame, SkullScene } from '../../scene/SkullScene.ts';

/** The slice of the scene the driver wires. */
export type DriverScene = Pick<SkullScene, 'setPaused' | 'resize' | 'invalidate'>;

interface DriverCache {
  metrics: AssemblyMetrics;
  /** Whether an assembly range element exists (otherwise `inAssemblyRange` stays false). */
  hasRange: boolean;
}

export interface DriverOptions {
  /** Maps the wall clock to the opening sample; defaults to the finished opening. */
  sampleOpening?: (nowMs: number) => OpeningSample;
  /** Wall clock in ms; defaults to `performance.now`. */
  now?: () => number;
}

/**
 * Wires the page to the scene (design D8, D10, D11, D22, D25): `visibilitychange`
 * pauses, the host ResizeObserver resizes the renderer (through the resize-storm
 * guard), and a passive `scroll` listener only wakes the demand loop. Document
 * metrics (the assembly range) are
 * cached from a document ResizeObserver plus `window` resize, so the per-frame
 * `readScrollFrame` reads only `window.scrollY` and the injected clock.
 * `inAssemblyRange` is state that changes only when `scrollY` crosses the range start.
 */
export function useSceneDriver(
  hostRef: RefObject<HTMLElement | null>,
  scene: DriverScene | null,
  options: DriverOptions = {},
): { readScrollFrame: () => ScrollFrame; inAssemblyRange: boolean } {
  const cache = useRef<DriverCache>({
    metrics: { start: 0, end: 0, maxScroll: 0 },
    hasRange: false,
  });
  const [inAssemblyRange, setInAssemblyRange] = useState(false);
  const inRange = useRef(false);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const readScrollFrame = useCallback((): ScrollFrame => {
    const { metrics } = cache.current;
    const { sampleOpening, now = () => performance.now() } = optionsRef.current;
    const scrollY = window.scrollY;
    return {
      target: assemblyTarget(scrollY, metrics),
      opening: sampleOpening === undefined ? OPENING_DONE : sampleOpening(now()),
    };
  }, []);

  useEffect(() => {
    const syncRange = (): void => {
      const { hasRange, metrics } = cache.current;
      const next = hasRange && window.scrollY >= metrics.start;
      // Guarded by a ref so unrelated scrolls never even schedule a render.
      if (next !== inRange.current) {
        inRange.current = next;
        setInAssemblyRange(next);
      }
    };
    const measure = (): void => {
      const scrollY = window.scrollY;
      const maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
      const range = document.querySelector(`[${ASSEMBLY_RANGE_ATTR}]`);
      const rangeRect = range?.getBoundingClientRect();
      // Assembly runs over the range: it starts when its top reaches the viewport top and
      // ends when its bottom reaches the viewport bottom (or at the page end). Without a
      // range the assembly spans the whole page.
      const metrics: AssemblyMetrics =
        rangeRect === undefined
          ? { start: 0, end: maxScroll, maxScroll }
          : {
              start: rangeRect.top + scrollY,
              end: Math.min(rangeRect.top + scrollY + rangeRect.height - window.innerHeight, maxScroll),
              maxScroll,
            };
      cache.current = {
        metrics,
        hasRange: rangeRect !== undefined,
      };
      syncRange();
    };
    measure();

    const refresh = (): void => {
      measure();
      scene?.invalidate();
    };
    const documentObserver = new ResizeObserver(refresh);
    documentObserver.observe(document.documentElement);
    window.addEventListener('resize', refresh);
    const onScroll = (): void => {
      syncRange();
      scene?.invalidate();
    };
    window.addEventListener('scroll', onScroll, { passive: true });

    let lastSize: { w: number; h: number } | null = null;
    const host = hostRef.current;
    const hostObserver = new ResizeObserver((entries) => {
      const entry = entries[entries.length - 1];
      if (entry === undefined) {
        return;
      }
      const next = { w: entry.contentRect.width, h: entry.contentRect.height };
      if (shouldResizeRenderer(lastSize, next)) {
        lastSize = next;
        scene?.resize(next.w, next.h);
      }
    });
    if (host !== null) {
      hostObserver.observe(host);
    }

    const onVisibilityChange = (): void => {
      scene?.setPaused('hidden', document.visibilityState === 'hidden');
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    if (document.visibilityState === 'hidden') {
      onVisibilityChange();
    }

    return () => {
      documentObserver.disconnect();
      hostObserver.disconnect();
      window.removeEventListener('resize', refresh);
      window.removeEventListener('scroll', onScroll);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [hostRef, scene]);

  return { readScrollFrame, inAssemblyRange };
}
