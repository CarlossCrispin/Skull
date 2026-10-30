import { clamp } from './easing.ts';
import { MAX_DT_S, REF_FPS, SMOOTH_BASE } from './constants.ts';

/**
 * Dt-corrected smoothing factor `1 - (1 - base)^(dt * refFps)`. `dt` is clamped
 * to [0, MAX_DT_S] so a long frame or a resumed tab never produces a jump.
 */
export function smoothingAlpha(
  dtSeconds: number,
  base: number = SMOOTH_BASE,
  refFps: number = REF_FPS,
): number {
  return 1 - (1 - base) ** (clamp(dtSeconds, 0, MAX_DT_S) * refFps);
}

/** One smoothing tick: moves `current` toward `target` without overshoot. */
export function smoothTowards(current: number, target: number, dtSeconds: number): number {
  return current + (target - current) * smoothingAlpha(dtSeconds);
}
