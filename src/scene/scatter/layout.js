import { RESIZE_HEIGHT_TOLERANCE } from '../constants.js';

/**
 * Resize-storm guard: any width change resizes; a height-only change resizes
 * only above `RESIZE_HEIGHT_TOLERANCE` of the previous height (mobile URL bar).
 */
export function shouldResizeRenderer(
  prev,
  next,
) {
  if (!prev || prev.w !== next.w) {
    return true;
  }
  return Math.abs(next.h - prev.h) > RESIZE_HEIGHT_TOLERANCE * prev.h;
}
