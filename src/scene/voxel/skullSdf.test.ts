import { describe, expect, it } from 'vitest';
import { hash3 } from './prng.ts';
import {
  CENTER,
  EYE_SOCKET_CENTER,
  GRID_D,
  GRID_H,
  GRID_W,
  NASAL_CENTER,
  inEyeSocket,
  inMouthSlit,
  inNasalCavity,
  skullSdf,
} from './skullSdf.ts';

const [SX, SY] = EYE_SOCKET_CENTER;
const [NX, NY] = NASAL_CENTER;

describe('grid constants', () => {
  it('match the design (48 x 56 x 44, centered at half-integers)', () => {
    expect([GRID_W, GRID_H, GRID_D]).toEqual([48, 56, 44]);
    expect(CENTER).toEqual([23.5, 27.5, 21.5]);
  });
});

describe('skullSdf composition', () => {
  it('is inside at a cranium point and outside far from the skull', () => {
    expect(skullSdf(0, 12, -2)).toBeLessThan(0);
    expect(skullSdf(0, 40, 0)).toBeGreaterThan(0);
    expect(skullSdf(30, 0, 0)).toBeGreaterThan(0);
  });

  it('is mirror symmetric in X for arbitrary points', () => {
    for (let i = 0; i < 200; i++) {
      const x = hash3(i, 1, 1, 5) * 46 - 23;
      const y = hash3(i, 2, 1, 5) * 54 - 27;
      const z = hash3(i, 3, 1, 5) * 42 - 21;
      expect(skullSdf(x, y, z)).toBe(skullSdf(-x, y, z));
    }
  });

  it('fits the grid: no solid cell in the one-voxel padding layer around the volume (nothing is clipped)', () => {
    let solidInPadding = 0;
    let padCells = 0;
    for (let xi = -1; xi <= GRID_W; xi++) {
      for (let yi = -1; yi <= GRID_H; yi++) {
        for (let zi = -1; zi <= GRID_D; zi++) {
          const padding = xi === -1 || yi === -1 || zi === -1 || xi === GRID_W || yi === GRID_H || zi === GRID_D;
          if (!padding) {
            continue;
          }
          padCells++;
          if (skullSdf(xi - 23.5, yi - 27.5, zi - 21.5) <= 0) {
            solidInPadding++;
          }
        }
      }
    }
    expect(padCells).toBe(50 * 58 * 46 - 48 * 56 * 44);
    expect(solidInPadding).toBe(0);
  });
});

describe('region predicates', () => {
  it('eye socket: true at both socket centers, false at the cranium center and nose', () => {
    expect(inEyeSocket(SX, SY, 0)).toBe(true);
    expect(inEyeSocket(-SX, SY, 0)).toBe(true);
    expect(inEyeSocket(0, 9.5, -1.5)).toBe(false);
    expect(inEyeSocket(NX, NY, 0)).toBe(false);
  });

  it('nasal cavity: true at the nose center, false at the cranium center and sockets', () => {
    expect(inNasalCavity(NX, NY, 0)).toBe(true);
    expect(inNasalCavity(0, 9.5, -1.5)).toBe(false);
    expect(inNasalCavity(SX, SY, 0)).toBe(false);
  });

  it('sockets and nose are through-holes: the skull is never solid along the full depth', () => {
    for (let zi = 0; zi < GRID_D; zi++) {
      const z = zi - 21.5;
      expect(skullSdf(SX, SY, z)).toBeGreaterThan(0);
      expect(skullSdf(-SX, SY, z)).toBeGreaterThan(0);
      expect(skullSdf(NX, NY, z)).toBeGreaterThan(0);
    }
  });

  it('sockets and nose have solid skull around them at the same depth (enclosed)', () => {
    expect(skullSdf(SX + 9, SY, 0)).toBeLessThan(0);
    expect(skullSdf(SX, SY + 9, 0)).toBeLessThan(0);
    expect(skullSdf(0, NY - 5.5, 0)).toBeLessThan(0);
  });

  it('mouth slit is shallow: open at the front, solid behind', () => {
    expect(inMouthSlit(0, -19, 10)).toBe(true);
    expect(skullSdf(0, -19, 10)).toBeGreaterThan(0);
    expect(skullSdf(0, -19, -2)).toBeLessThan(0);
    expect(inMouthSlit(0, 9.5, -1.5)).toBe(false);
  });
});

describe('teeth', () => {
  it('have 1-voxel gaps: tooth columns are solid, gap columns are open at the same height and depth', () => {
    // upper tooth row, front layer. grid x index 23 / 24 form the central tooth,
    // index 22 / 25 are gaps (canonical c = min(i, 47 - i); gap when c % 3 === 1).
    expect(skullSdf(-0.5, -15.5, 12)).toBeLessThan(0);
    expect(skullSdf(0.5, -15.5, 12)).toBeLessThan(0);
    expect(skullSdf(-1.5, -15.5, 12)).toBeGreaterThan(0);
    expect(skullSdf(1.5, -15.5, 12)).toBeGreaterThan(0);
    expect(skullSdf(-2.5, -15.5, 12)).toBeLessThan(0);
    expect(skullSdf(-3.5, -15.5, 12)).toBeLessThan(0);
    expect(skullSdf(-4.5, -15.5, 12)).toBeGreaterThan(0);
  });

  it('lower teeth are gapped too', () => {
    expect(skullSdf(-0.5, -22.5, 11)).toBeLessThan(0);
    expect(skullSdf(-1.5, -22.5, 11)).toBeGreaterThan(0);
  });
});
