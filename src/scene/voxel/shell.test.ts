import { describe, expect, it } from 'vitest';
import { extractShell, voxelIndex } from './shell.ts';

function solidBlock(w: number, h: number, d: number): Uint8Array {
  return new Uint8Array(w * h * d).fill(1);
}

describe('voxelIndex', () => {
  it('is x-fastest, then y, then z', () => {
    expect(voxelIndex(0, 0, 0, 4, 5)).toBe(0);
    expect(voxelIndex(1, 0, 0, 4, 5)).toBe(1);
    expect(voxelIndex(0, 1, 0, 4, 5)).toBe(4);
    expect(voxelIndex(0, 0, 1, 4, 5)).toBe(20);
    expect(voxelIndex(3, 4, 2, 4, 5)).toBe(3 + 4 * 4 + 20 * 2);
  });
});

describe('extractShell', () => {
  it('solid 3x3x3 yields the 26 outer voxels and not the center', () => {
    const shell = extractShell(solidBlock(3, 3, 3), 3, 3, 3);
    expect(shell).toHaveLength(26);
    expect(shell).not.toContain(voxelIndex(1, 1, 1, 3, 3));
  });

  it('solid 5x5x5 yields 125 - 27 = 98 (out-of-bounds counts as empty)', () => {
    expect(extractShell(solidBlock(5, 5, 5), 5, 5, 5)).toHaveLength(98);
  });

  it('a one-voxel hole lines its cavity walls: 98 outer + 6 face neighbors of the hole', () => {
    const solid = solidBlock(5, 5, 5);
    solid[voxelIndex(2, 2, 2, 5, 5)] = 0;
    const shell = extractShell(solid, 5, 5, 5);
    expect(shell).toHaveLength(104);
    for (const [x, y, z] of [
      [1, 2, 2],
      [3, 2, 2],
      [2, 1, 2],
      [2, 3, 2],
      [2, 2, 1],
      [2, 2, 3],
    ] as const) {
      expect(shell).toContain(voxelIndex(x, y, z, 5, 5));
    }
    // an inner-ring corner next to no empty cell stays interior
    expect(shell).not.toContain(voxelIndex(1, 1, 1, 5, 5));
  });

  it('empty cells are never emitted and an all-empty grid is empty', () => {
    const solid = new Uint8Array(27);
    solid[13] = 1; // single voxel
    expect(extractShell(solid, 3, 3, 3)).toEqual([13]);
    expect(extractShell(new Uint8Array(27), 3, 3, 3)).toEqual([]);
  });

  it('is returned in ascending index order', () => {
    const shell = extractShell(solidBlock(4, 4, 4), 4, 4, 4);
    expect([...shell].sort((a, b) => a - b)).toEqual(shell);
  });
});
