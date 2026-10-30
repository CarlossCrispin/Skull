import { clamp } from './easing.ts';

/**
 * Block A scroll progress in [0, 1]: `clamp((scrollY - blockTop) / blockHeight, 0, 1)`.
 * A deterministic function of the scroll position only; a non-positive height yields 0.
 */
export function scrollProgress(scrollY: number, blockTop: number, blockHeight: number): number {
  if (!(blockHeight > 0)) {
    return 0;
  }
  return clamp((scrollY - blockTop) / blockHeight, 0, 1);
}
