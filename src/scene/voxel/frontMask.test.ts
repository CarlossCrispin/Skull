import { describe, expect, it } from 'vitest';
import { generateSkull } from './generate.ts';
import { countEnclosedVoids, frontMask, toAscii, type FrontMask } from './frontMask.ts';
import type { VoxelModel } from './model.ts';

function modelOf(voxels: readonly (readonly [number, number, number, 0 | 1])[]): VoxelModel {
  const positions = new Int16Array(voxels.length * 3);
  const flat = new Uint8Array(voxels.length);
  voxels.forEach(([x, y, z, f], i) => {
    positions.set([x, y, z], 3 * i);
    flat[i] = f;
  });
  return {
    size: { w: 48, h: 56, d: 44 },
    count: voxels.length,
    positions,
    tone: new Uint8Array(voxels.length),
    tile: new Uint8Array(voxels.length),
    flat,
    color: new Uint8Array(voxels.length * 3),
  };
}

function maskOf(rows: readonly string[]): FrontMask {
  const width = rows[0]!.length;
  const cells = new Uint8Array(width * rows.length);
  rows.forEach((row, r) => [...row].forEach((ch, c) => (cells[r * width + c] = ch === '#' ? 1 : 0)));
  return { width, height: rows.length, cells };
}

describe('frontMask', () => {
  it('projects along z (row 0 is the top, y = 55) and marks skull voxels only', () => {
    const model = modelOf([
      [3, 55, 7, 0],
      [3, 55, 30, 0], // same (x, y), different depth: still one cell
      [10, 0, 5, 0],
      [20, 20, 20, 1], // accent excluded
    ]);
    const mask = frontMask(model);
    expect(mask.width).toBe(48);
    expect(mask.height).toBe(56);
    const occupied: string[] = [];
    for (let r = 0; r < mask.height; r++) {
      for (let c = 0; c < mask.width; c++) {
        if (mask.cells[r * mask.width + c] === 1) {
          occupied.push(`${c},${r}`);
        }
      }
    }
    expect(occupied).toEqual(['3,0', '10,55']);
  });

  it('an accent alone leaves the mask empty (it must not fill socket voids)', () => {
    const mask = frontMask(modelOf([[33, 28, 24, 1]]));
    expect(mask.cells.reduce((n, v) => n + v, 0)).toBe(0);
  });
});

describe('toAscii', () => {
  it('renders 56 rows of 48 columns with # and .', () => {
    const ascii = toAscii(frontMask(modelOf([[0, 55, 0, 0], [47, 0, 0, 0]])));
    const rows = ascii.split('\n');
    expect(rows).toHaveLength(56);
    expect(rows.every((r) => r.length === 48)).toBe(true);
    expect(rows[0]![0]).toBe('#');
    expect(rows[55]![47]).toBe('#');
    expect(rows[0]!.slice(1)).toBe('.'.repeat(47));
    expect(ascii.match(/#/g)).toHaveLength(2);
  });

  it('round-trips a hand-made mask', () => {
    expect(toAscii(maskOf(['##.', '.#.']))).toBe('##.\n.#.');
  });
});

describe('countEnclosedVoids', () => {
  it('counts a ring hole as 1 and two separate holes as 2', () => {
    expect(countEnclosedVoids(maskOf(['###', '#.#', '###']))).toBe(1);
    expect(countEnclosedVoids(maskOf(['#####', '#.#.#', '#####']))).toBe(2);
  });

  it('does not count empty regions connected to the border or reachable only diagonally', () => {
    expect(countEnclosedVoids(maskOf(['###', '#..', '###']))).toBe(0);
    expect(countEnclosedVoids(maskOf(['.....', '.###.', '.#.#.', '.###.', '.....']))).toBe(1);
    // diagonal leak is NOT a 4-connected escape: the hole stays enclosed
    expect(countEnclosedVoids(maskOf(['.#.', '#.#', '.#.']))).toBe(1);
  });

  it('counts a multi-cell void once', () => {
    expect(countEnclosedVoids(maskOf(['####', '#..#', '#..#', '####']))).toBe(1);
  });
});

describe('generated skull front view', () => {
  const model = generateSkull();
  const mask = frontMask(model);
  const at = (x: number, y: number): number => mask.cells[(55 - y) * 48 + x]!;

  it('has at least 3 enclosed voids (two sockets and the nose)', () => {
    expect(countEnclosedVoids(mask)).toBeGreaterThanOrEqual(3);
  });

  it('has exactly 13 enclosed voids (golden-backed: 2 sockets, nose, 10 tooth gaps)', () => {
    expect(countEnclosedVoids(mask)).toBe(13);
  });

  it('matches the approved golden front mask', async () => {
    await expect(toAscii(mask)).toMatchFileSnapshot('./__fixtures__/front-mask.txt');
  });

  it('socket and nasal centers are empty cells surrounded by occupied cells', () => {
    for (const [x, y] of [
      [14, 28],
      [33, 28],
      [23, 19],
    ] as const) {
      expect(at(x, y)).toBe(0);
    }
    expect(at(23, 40)).toBe(1); // cranium
    expect(at(23, 2)).toBe(1); // chin
  });
});
