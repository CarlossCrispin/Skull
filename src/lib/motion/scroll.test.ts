import { describe, expect, it } from 'vitest';
import { scrollProgress } from './scroll.ts';

describe('scrollProgress', () => {
  it('maps the spec table for blockAHeight 800 (-20, 0, 400, 800, 1600)', () => {
    const table: ReadonlyArray<readonly [number, number]> = [
      [-20, 0],
      [0, 0],
      [400, 0.5],
      [800, 1],
      [1600, 1],
    ];
    for (const [scrollY, expected] of table) {
      expect(scrollProgress(scrollY, 0, 800)).toBe(expected);
    }
  });

  it('subtracts the block top before normalizing', () => {
    expect(scrollProgress(300, 100, 800)).toBe(0.25);
    expect(scrollProgress(50, 100, 800)).toBe(0);
    expect(scrollProgress(900, 100, 800)).toBe(1);
  });

  it('is independent of direction and history: same scrollY always yields the same value', () => {
    const path = [0, 300, 800, 1200, 300, 0, 300];
    const seen = path.map((y) => scrollProgress(y, 0, 800));
    expect(seen[1]).toBe(0.375);
    expect(seen[4]).toBe(seen[1]);
    expect(seen[6]).toBe(seen[1]);
    expect(seen[0]).toBe(seen[5]);
  });

  it('returns 0 for a degenerate block height instead of NaN', () => {
    expect(scrollProgress(100, 0, 0)).toBe(0);
    expect(scrollProgress(100, 0, -5)).toBe(0);
  });
});
