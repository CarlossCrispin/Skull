import { describe, expect, it } from 'vitest';
import {
  SCATTER_DZ_MAX,
  SCATTER_DZ_MIN,
  SCATTER_ONSCREEN_SHARE,
} from '../constants.js';
import { generateScatter } from './generateScatter.js';

const COUNT = 9384;

describe('generateScatter', () => {
  it('is deterministic per seed and differs between seeds', () => {
    const a = generateScatter(500, 11);
    const b = generateScatter(500, 11);
    const c = generateScatter(500, 12);
    expect(Array.from(a.scatter)).toEqual(Array.from(b.scatter));
    expect(Array.from(a.delay)).toEqual(Array.from(b.delay));
    expect(Array.from(a.scatter)).not.toEqual(Array.from(c.scatter));
  });

  it('returns 3 scatter values and 1 delay per instance', () => {
    const { scatter, delay } = generateScatter(123);
    expect(scatter.length).toBe(3 * 123);
    expect(delay.length).toBe(123);
  });

  it('keeps every delay inside [0, 1]', () => {
    const { delay } = generateScatter(COUNT);
    expect(delay.length).toBe(COUNT);
    expect(Math.min(...delay)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...delay)).toBeLessThanOrEqual(1);
    expect(Math.max(...delay) - Math.min(...delay)).toBeGreaterThan(0.9);
  });

  it('no longer redraws |u| < 1e-3 (the column remap that needed a sign is gone)', () => {
    const { scatter } = generateScatter(200_000);
    let near = 0;
    for (let i = 0; i < 200_000; i += 1) {
      const u = scatter[3 * i];
      const v = scatter[3 * i + 1];
      // Off-screen ring cubes straight above or below the center (the old redraw excluded them).
      near += Math.abs(u) < 1e-3 && Math.abs(v) > 1 ? 1 : 0;
    }
    expect(near).toBeGreaterThan(0);
  });

  it('places about 5 % of the cubes on screen and the rest in the 1..1.6 ring', () => {
    expect(SCATTER_ONSCREEN_SHARE).toBe(0.05);
    const { scatter } = generateScatter(COUNT);
    let onScreen = 0;
    for (let i = 0; i < COUNT; i += 1) {
      const u = Math.abs(scatter[3 * i]);
      const v = Math.abs(scatter[3 * i + 1]);
      const reach = Math.max(u, v);
      if (reach <= 1) {
        onScreen += 1;
      } else {
        expect(reach).toBeLessThanOrEqual(1.6);
      }
    }
    expect(onScreen / COUNT).toBeGreaterThanOrEqual(0.04);
    expect(onScreen / COUNT).toBeLessThanOrEqual(0.06);
  });

  it('spreads on-screen cubes uniformly over the viewport, with no edge band', () => {
    const { scatter } = generateScatter(COUNT);
    const quadrants = [0, 0, 0, 0];
    let onScreen = 0;
    let central = 0;
    let vMin = Infinity;
    let vMax = -Infinity;
    for (let i = 0; i < COUNT; i += 1) {
      const u = scatter[3 * i];
      const v = scatter[3 * i + 1];
      if (Math.max(Math.abs(u), Math.abs(v)) > 1) {
        continue;
      }
      onScreen += 1;
      const quadrant = (u < 0 ? 0 : 1) + (v < 0 ? 0 : 2);
      quadrants[quadrant] = (quadrants[quadrant]) + 1;
      central += Math.abs(u) < 0.5 ? 1 : 0;
      vMin = Math.min(vMin, v);
      vMax = Math.max(vMax, v);
    }
    expect(onScreen).toBeGreaterThan(300);
    for (const count of quadrants) {
      expect(count).toBeGreaterThan(0.18 * onScreen);
    }
    // uniform u in [-1, 1]: about half of the cubes have |u| < 0.5 (the old band gave none)
    expect(central / onScreen).toBeGreaterThan(0.4);
    expect(central / onScreen).toBeLessThan(0.6);
    expect(vMin).toBeLessThan(-0.95);
    expect(vMax).toBeGreaterThan(0.95);
  });

  it('sends off-screen cubes in every direction of the ring', () => {
    const { scatter } = generateScatter(COUNT);
    const dirs = { left: 0, right: 0, up: 0, down: 0 };
    for (let i = 0; i < COUNT; i += 1) {
      const u = scatter[3 * i];
      const v = scatter[3 * i + 1];
      if (Math.max(Math.abs(u), Math.abs(v)) <= 1) {
        continue;
      }
      if (u < -1) dirs.left += 1;
      if (u > 1) dirs.right += 1;
      if (v < -1) dirs.up += 1;
      if (v > 1) dirs.down += 1;
    }
    for (const count of Object.values(dirs)) {
      expect(count).toBeGreaterThan(1000);
    }
  });

  it('keeps dz inside [SCATTER_DZ_MIN, SCATTER_DZ_MAX] and spread over it', () => {
    const { scatter } = generateScatter(COUNT);
    let lo = Infinity;
    let hi = -Infinity;
    for (let i = 0; i < COUNT; i += 1) {
      const dz = scatter[3 * i + 2];
      lo = Math.min(lo, dz);
      hi = Math.max(hi, dz);
    }
    expect(lo).toBeGreaterThanOrEqual(SCATTER_DZ_MIN);
    expect(hi).toBeLessThanOrEqual(SCATTER_DZ_MAX);
    expect(hi - lo).toBeGreaterThan(0.9 * (SCATTER_DZ_MAX - SCATTER_DZ_MIN));
  });
});
