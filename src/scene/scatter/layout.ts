import { RESIZE_HEIGHT_TOLERANCE } from '../constants.ts';

/**
 * Resize-storm guard: any width change resizes; a height-only change resizes
 * only above `RESIZE_HEIGHT_TOLERANCE` of the previous height (mobile URL bar).
 */
export function shouldResizeRenderer(
  prev: { readonly w: number; readonly h: number } | null,
  next: { readonly w: number; readonly h: number },
): boolean {
  if (!prev || prev.w !== next.w) {
    return true;
  }
  return Math.abs(next.h - prev.h) > RESIZE_HEIGHT_TOLERANCE * prev.h;
}
