import { describe, expect, it } from 'vitest';
import { hash3, mulberry32 } from './prng.ts';

describe('mulberry32', () => {
  it('same seed yields the same sequence', () => {
    const a = mulberry32(12345);
    const b = mulberry32(12345);
    const seqA = Array.from({ length: 50 }, () => a());
    const seqB = Array.from({ length: 50 }, () => b());
    expect(seqA).toEqual(seqB);
    expect(new Set(seqA).size).toBeGreaterThan(45);
  });

  it('different seeds yield different sequences', () => {
    const a = mulberry32(1);
    const b = mulberry32(2);
    expect([a(), a(), a()]).not.toEqual([b(), b(), b()]);
  });

  it('stays within [0, 1) over 10000 samples', () => {
    const r = mulberry32(99);
    let min = 1;
    let max = 0;
    for (let i = 0; i < 10000; i++) {
      const v = r();
      min = Math.min(min, v);
      max = Math.max(max, v);
    }
    expect(min).toBeGreaterThanOrEqual(0);
    expect(max).toBeLessThan(1);
    expect(max - min).toBeGreaterThan(0.99);
  });
});

describe('hash3', () => {
  it('is deterministic for the same inputs', () => {
    expect(hash3(3, 7, 11, 42)).toBe(hash3(3, 7, 11, 42));
  });

  it('is within [0, 1) over a grid and roughly uniform', () => {
    let sum = 0;
    let n = 0;
    for (let x = 0; x < 20; x++) {
      for (let y = 0; y < 20; y++) {
        for (let z = 0; z < 10; z++) {
          const v = hash3(x, y, z, 7);
          expect(v).toBeGreaterThanOrEqual(0);
          expect(v).toBeLessThan(1);
          sum += v;
          n++;
        }
      }
    }
    expect(n).toBe(4000);
    expect(sum / n).toBeGreaterThan(0.47);
    expect(sum / n).toBeLessThan(0.53);
  });

  it('differs by seed and by coordinate', () => {
    expect(hash3(1, 2, 3, 1)).not.toBe(hash3(1, 2, 3, 2));
    expect(hash3(1, 2, 3, 1)).not.toBe(hash3(3, 2, 1, 1));
    expect(hash3(1, 2, 3, 1)).not.toBe(hash3(1, 2, 4, 1));
  });

  it('equal for mirrored coordinates when the caller canonicalizes x', () => {
    const canon = (x: number): number => Math.min(x, 47 - x);
    expect(hash3(canon(5), 9, 9, 3)).toBe(hash3(canon(42), 9, 9, 3));
  });
});
