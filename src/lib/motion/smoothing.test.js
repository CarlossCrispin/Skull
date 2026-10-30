import { describe, expect, it } from 'vitest';
import { MAX_DT_S } from './constants.js';
import { smoothTowards, smoothingAlpha } from './smoothing.js';

function simulate(seconds, ticks, target, start = 0) {
  const dt = seconds / ticks;
  let s = start;
  for (let i = 0; i < ticks; i += 1) {
    s = smoothTowards(s, target, dt);
  }
  return s;
}

describe('smoothingAlpha', () => {
  it('equals 0.12 at dt = 1/60 within 1e-9', () => {
    expect(Math.abs(smoothingAlpha(1 / 60) - 0.12)).toBeLessThan(1e-9);
  });

  it('follows 1 - (1 - 0.12)^(dt * 60) at other frame rates', () => {
    expect(smoothingAlpha(1 / 30)).toBeCloseTo(1 - 0.88 ** 2, 12);
    expect(smoothingAlpha(1 / 120)).toBeCloseTo(1 - 0.88 ** 0.5, 12);
  });

  it('is 0 at dt = 0 and treats negative dt as 0', () => {
    expect(smoothingAlpha(0)).toBe(0);
    expect(smoothingAlpha(-1)).toBe(0);
  });

  it('clamps dt = 2 s to MAX_DT_S', () => {
    expect(MAX_DT_S).toBe(0.1);
    expect(smoothingAlpha(2)).toBe(smoothingAlpha(MAX_DT_S));
    expect(smoothingAlpha(2)).toBeCloseTo(1 - 0.88 ** 6, 12);
    expect(smoothingAlpha(2)).toBeLessThan(1);
  });
});

describe('smoothTowards', () => {
  it('moves current toward target by alpha at 60 fps', () => {
    expect(smoothTowards(0, 1, 1 / 60)).toBeCloseTo(0.12, 9);
    expect(smoothTowards(1, 0.5, 1 / 60)).toBeCloseTo(1 - 0.5 * 0.12, 9);
  });

  it('is frame-rate independent: 1 s as 60 ticks equals 1 s as 30 ticks within 1e-6', () => {
    const at60 = simulate(1, 60, 1);
    const at30 = simulate(1, 30, 1);
    expect(at60).toBeGreaterThan(0.99);
    expect(Math.abs(at60 - at30)).toBeLessThanOrEqual(1e-6);
  });

  it('never overshoots: result lies between current and target over a grid of cases', () => {
    const grid = [0, 0.1, 0.25, 0.5, 0.75, 0.9, 1];
    const dts = [1 / 240, 1 / 60, 1 / 30, 0.1, 0.5, 2];
    let checked = 0;
    for (const start of grid) {
      for (const target of grid) {
        for (const dt of dts) {
          const next = smoothTowards(start, target, dt);
          const lo = Math.min(start, target);
          const hi = Math.max(start, target);
          expect(next).toBeGreaterThanOrEqual(lo);
          expect(next).toBeLessThanOrEqual(hi);
          checked += 1;
        }
      }
    }
    expect(checked).toBe(grid.length * grid.length * dts.length);
  });

  it('uses the clamped dt: a 2 s tick moves exactly as far as a 100 ms tick', () => {
    expect(smoothTowards(0, 1, 2)).toBe(smoothTowards(0, 1, MAX_DT_S));
  });

  it('fast scroll: monotonic with per-frame step <= 0.12 of the full range', () => {
    let s = 0;
    let previous = 0;
    for (let frame = 0; frame < 120; frame += 1) {
      s = smoothTowards(s, 1, 1 / 60);
      expect(s).toBeGreaterThanOrEqual(previous);
      expect(s - previous).toBeLessThanOrEqual(0.12 + 1e-12);
      previous = s;
    }
    expect(previous).toBeGreaterThan(0.999);
  });

  it('first fast-scroll frame moves by exactly alpha (step not trivially zero)', () => {
    expect(smoothTowards(0, 1, 1 / 60)).toBeCloseTo(0.12, 9);
  });
});
