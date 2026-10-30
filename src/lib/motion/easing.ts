/** Clamps `v` to the inclusive range [min, max]. */
export function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

/** Linear interpolation from `a` to `b` by factor `k` (not clamped). */
export function lerp(a: number, b: number, k: number): number {
  return a + (b - a) * k;
}

/** Cubic ease-in-out mapping [0, 1] to [0, 1] with zero velocity at both ends. */
export function easeInOutCubic(x: number): number {
  return x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2;
}

/** Cubic ease-out mapping [0, 1] to [0, 1]: fast start, zero velocity at 1; input is clamped. */
export function easeOutCubic(x: number): number {
  const t = clamp(x, 0, 1);
  return 1 - (1 - t) ** 3;
}
