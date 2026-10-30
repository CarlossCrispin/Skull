import { useEffect, useLayoutEffect, type RefObject } from 'react';
import { planReveal } from '../motion/stagger.ts';

/** Visible share of an item that triggers its reveal (spec: threshold 0.15). */
const REVEAL_THRESHOLD = 0.15;

const READY_ATTRIBUTE = 'data-reveal-ready';
const REVEALED_ATTRIBUTE = 'data-revealed';
const DELAY_PROPERTY = '--reveal-delay';

/**
 * One-shot sequential reveal for the `[data-reveal]` items of a section (design D14, D26).
 * A single observer sees all items; when any pending item intersects,
 * `planReveal` reveals it and every earlier pending item, in document order. The hidden state only exists while the
 * section carries `data-reveal-ready`, so reduced motion, no IntersectionObserver
 * and a not-yet-initialized hook all leave the text visible. The flag is set in a layout
 * effect (no flash of visible text before the first paint) while the observer waits for
 * `gateOpen`, the end of the opening; its first callback then reveals the items already in view.
 */
export function useRevealGroup(sectionRef: RefObject<HTMLElement | null>, reducedMotion: boolean, gateOpen = true): void {
  useLayoutEffect(() => {
    const section = sectionRef.current;
    if (section === null || reducedMotion || typeof IntersectionObserver === 'undefined') {
      return;
    }
    section.setAttribute(READY_ATTRIBUTE, '');
    return () => {
      section.removeAttribute(READY_ATTRIBUTE);
    };
  }, [sectionRef, reducedMotion]);

  useEffect(() => {
    const section = sectionRef.current;
    if (section === null || reducedMotion || !gateOpen || typeof IntersectionObserver === 'undefined') {
      return;
    }
    const items = [...section.querySelectorAll<HTMLElement>('[data-reveal]')];
    const pending = new Set(items.filter((element) => !element.hasAttribute(REVEALED_ATTRIBUTE)));
    const observer = new IntersectionObserver(
      (entries) => {
        const intersecting = new Set<number>();
        for (const entry of entries) {
          if (entry.intersectionRatio >= REVEAL_THRESHOLD) {
            intersecting.add(items.indexOf(entry.target as HTMLElement));
          }
        }
        const pendingInOrder = items.flatMap((element, position) => (pending.has(element) ? [position] : []));
        for (const { index, delayMs } of planReveal(pendingInOrder, intersecting)) {
          const element = items[index] as HTMLElement;
          element.style.setProperty(DELAY_PROPERTY, `${delayMs}ms`);
          element.setAttribute(REVEALED_ATTRIBUTE, '');
          observer.unobserve(element);
          pending.delete(element);
        }
        if (pending.size === 0) {
          observer.disconnect();
        }
      },
      { threshold: REVEAL_THRESHOLD },
    );

    pending.forEach((element) => observer.observe(element));

    return () => {
      observer.disconnect();
    };
  }, [sectionRef, reducedMotion, gateOpen]);
}
