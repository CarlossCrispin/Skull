/** Primary pointer is coarse and cannot hover: phones and tablets without a mouse. */
export const TOUCH_ONLY_QUERY = '(hover: none) and (pointer: coarse)';

/** True on touch-only devices; false when matchMedia is unavailable. */
export function isTouchOnly() {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia(TOUCH_ONLY_QUERY).matches;
}
