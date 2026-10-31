import { clamp } from './easing.js';
import { MAX_DT_S, REF_FPS, SMOOTH_BASE } from './constants.js';

/**
 * Dt-corrected smoothing factor `1 - (1 - base)^(dt * refFps)`. `dt` is clamped
 * to [0, MAX_DT_S] so a long frame or a resumed tab never produces a jump.
 */
export function smoothingAlpha(
  dtSeconds,
  base = SMOOTH_BASE,
  refFps = REF_FPS,
) {
  return 1 - (1 - base) ** (clamp(dtSeconds, 0, MAX_DT_S) * refFps);
}

/** One smoothing tick: moves `current` toward `target` without overshoot. */
export function smoothTowards(current, target, dtSeconds) {
  return current + (target - current) * smoothingAlpha(dtSeconds);
}
