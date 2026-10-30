import { useEffect, type RefObject } from 'react';

/** Visible share of the indicator that arms the hide (spec: at least 50 %). */
const ARM_THRESHOLD = 0.5;
const HIDDEN_ATTRIBUTE = 'data-hidden';

/**
 * Hides the scroll indicator for good on the first scroll after it is at least 50 % visible
 * (design D27, G3). Arming and hiding are one-shot: the observer stops once armed, the
 * `scroll` listener is passive and `once`, and `data-hidden` is never removed. The scroll that
 * brings the indicator into view does not hide it because the listener is added afterwards.
 */
export function useHideOnFirstScroll(ref: RefObject<HTMLElement | null>): void {
  useEffect(() => {
    const element = ref.current;
    if (element === null || typeof IntersectionObserver === 'undefined') {
      return;
    }

    const hide = () => element.setAttribute(HIDDEN_ATTRIBUTE, '');
    let armed = false;
    const observer = new IntersectionObserver(
      (entries) => {
        if (armed || !entries.some((entry) => entry.intersectionRatio >= ARM_THRESHOLD)) {
          return;
        }
        armed = true;
        observer.disconnect();
        window.addEventListener('scroll', hide, { passive: true, once: true });
      },
      { threshold: ARM_THRESHOLD },
    );
    observer.observe(element);

    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', hide);
    };
  }, [ref]);
}
