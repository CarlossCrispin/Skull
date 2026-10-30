import { describe, expect, it } from 'vitest';
import { clamp, easeInOutCubic, easeOutCubic, lerp } from './easing.ts';

describe('clamp', () => {
  it('clamps above the range to max', () => {
    expect(clamp(5, 0, 1)).toBe(1);
  });

  it('clamps below the range to min', () => {
    expect(clamp(-1, 0, 1)).toBe(0);
  });

  it('keeps values already inside the range', () => {
    expect(clamp(0.4, 0, 1)).toBe(0.4);
  });
});

describe('lerp', () => {
  it('returns the endpoints at k = 0 and k = 1', () => {
    expect(lerp(2, 10, 0)).toBe(2);
    expect(lerp(2, 10, 1)).toBe(10);
  });

  it('interpolates linearly in between and extrapolates outside [0, 1]', () => {
    expect(lerp(2, 10, 0.25)).toBe(4);
    expect(lerp(-4, 4, 0.5)).toBe(0);
    expect(lerp(0, 10, 1.5)).toBe(15);
  });
});

describe('easeInOutCubic', () => {
  const velocity = (x: number): number => {
    const h = 1e-4;
    return (easeInOutCubic(x + h) - easeInOutCubic(x - h)) / (2 * h);
  };

  it('maps the endpoints 0 -> 0 and 1 -> 1 and the midpoint to 0.5', () => {
    expect(easeInOutCubic(0)).toBe(0);
    expect(easeInOutCubic(1)).toBe(1);
    expect(easeInOutCubic(0.5)).toBeCloseTo(0.5, 12);
  });

  it('is monotonic non-decreasing over 100 samples and stays inside [0, 1]', () => {
    let previous = easeInOutCubic(0);
    for (let i = 1; i <= 100; i += 1) {
      const value = easeInOutCubic(i / 100);
      expect(value).toBeGreaterThanOrEqual(previous);
      expect(value).toBeLessThanOrEqual(1);
      previous = value;
    }
    expect(previous).toBe(1);
  });

  it('is fastest at the middle and slow at both ends (finite-difference velocity)', () => {
    expect(velocity(0.5)).toBeGreaterThan(velocity(0.05));
    expect(velocity(0.5)).toBeGreaterThan(velocity(0.95));
    expect(velocity(0.5)).toBeCloseTo(3, 2);
  });

  it('has approximately zero velocity at both ends', () => {
    expect(easeInOutCubic(1e-3)).toBeLessThan(1e-7);
    expect(1 - easeInOutCubic(1 - 1e-3)).toBeLessThan(1e-7);
  });

  it('is symmetric: f(x) + f(1 - x) = 1', () => {
    expect(easeInOutCubic(0.2) + easeInOutCubic(0.8)).toBeCloseTo(1, 12);
    expect(easeInOutCubic(0.35) + easeInOutCubic(0.65)).toBeCloseTo(1, 12);
  });
});

describe('easeOutCubic', () => {
  it('maps 0 to 0 and 1 to 1', () => {
    expect(easeOutCubic(0)).toBe(0);
    expect(easeOutCubic(1)).toBe(1);
  });

  it('is monotonic over 100 samples', () => {
    let previous = -1;
    for (let step = 0; step <= 100; step += 1) {
      const value = easeOutCubic(step / 100);
      expect(value).toBeGreaterThanOrEqual(previous);
      previous = value;
    }
    expect(previous).toBe(1);
  });

  it('decelerates: faster at 5 % than at 95 % (finite-difference velocity)', () => {
    const velocity = (x: number): number => (easeOutCubic(x + 1e-4) - easeOutCubic(x - 1e-4)) / 2e-4;
    expect(velocity(0.05)).toBeGreaterThan(velocity(0.95));
    expect(velocity(0.05)).toBeCloseTo(3 * 0.95 ** 2, 2);
    expect(easeOutCubic(0.5)).toBeCloseTo(0.875, 12);
  });

  it('clamps outside [0, 1]', () => {
    expect(easeOutCubic(-0.5)).toBe(0);
    expect(easeOutCubic(1.5)).toBe(1);
  });
});
