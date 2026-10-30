import { describe, expect, it } from 'vitest';
import {
  DROPOUT_MAX_PROBABILITY,
  DROPOUT_START_RADIUS,
  SKULL_SEED,
  buildSolidVolume,
  dropoutProbability,
  generateSkull,
  isProtectedZone,
  normalizedRadius,
} from './generate.ts';
import { cavityDistance, inEyeSocket, inNasalCavity } from './skullSdf.ts';
import { TONE_TOKENS, type VoxelModel } from './model.ts';
import { voxelIndex } from './shell.ts';

const CENTER = [23.5, 27.5, 21.5] as const;
const key = (x: number, y: number, z: number): string => `${x},${y},${z}`;

function keysOf(model: VoxelModel, onlySkull = true): Set<string> {
  const set = new Set<string>();
  for (let i = 0; i < model.count; i++) {
    if (onlySkull && model.flat[i] !== 0) {
      continue;
    }
    set.add(key(model.positions[3 * i]!, model.positions[3 * i + 1]!, model.positions[3 * i + 2]!));
  }
  return set;
}

/** Accent cubes (flat = 1) are the documented exception to skull-voxel invariants. */
const skullCount = (model: VoxelModel): number => model.flat.reduce((n, v) => n + (v === 0 ? 1 : 0), 0);

const core = generateSkull({ dropout: false });
const full = generateSkull();

describe('model shape', () => {
  it('has typed arrays sized to count and the design grid', () => {
    expect(full.size).toEqual({ w: 48, h: 56, d: 44 });
    expect(SKULL_SEED).toBe(20261102);
    expect(full.positions).toBeInstanceOf(Int16Array);
    expect(full.positions).toHaveLength(full.count * 3);
    expect(full.tone).toHaveLength(full.count);
    expect(full.tile).toHaveLength(full.count);
    expect(full.flat).toHaveLength(full.count);
    expect(full.color).toHaveLength(full.count * 3);
    expect(TONE_TOKENS).toEqual(['gray-200', 'bg-alt', 'gray-400', 'gray-700']);
  });

  it('assigns tones 0..3 and tiles 0..7, with every gray token used', () => {
    const tones = new Set<number>();
    const tiles = new Set<number>();
    for (let i = 0; i < full.count; i++) {
      if (full.flat[i] === 0) {
        tones.add(full.tone[i]!);
        tiles.add(full.tile[i]!);
      }
    }
    expect([...tones].sort()).toEqual([0, 1, 2, 3]);
    expect([...tiles].sort()).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
  });

  it('colors each skull voxel with its gray token (exact bytes)', () => {
    const expected: Record<number, [number, number, number]> = {
      0: [0xd8, 0xd8, 0xd8],
      1: [0xed, 0xed, 0xed],
      2: [0x88, 0x88, 0x88],
      3: [0x2b, 0x2b, 0x2c],
    };
    let checked = 0;
    for (let i = 0; i < full.count; i++) {
      if (full.flat[i] === 1) {
        continue;
      }
      checked++;
      expect([full.color[3 * i], full.color[3 * i + 1], full.color[3 * i + 2]]).toEqual(
        expected[full.tone[i]!],
      );
    }
    expect(checked).toBe(skullCount(full));
  });
});

describe('cavity lining tone', () => {
  it('voxels within 1.5 of a cavity are gray-700 (3), all others are never gray-700', () => {
    let lining = 0;
    let other = 0;
    for (let i = 0; i < full.count; i++) {
      if (full.flat[i] === 1) {
        continue;
      }
      const d = cavityDistance(
        full.positions[3 * i]! - CENTER[0],
        full.positions[3 * i + 1]! - CENTER[1],
        full.positions[3 * i + 2]! - CENTER[2],
      );
      if (d < 1.5) {
        lining++;
        expect(full.tone[i]).toBe(3);
      } else {
        other++;
        expect(full.tone[i]).not.toBe(3);
      }
    }
    expect(lining).toBeGreaterThan(100);
    expect(other).toBeGreaterThan(1000);
  });
});

describe('determinism', () => {
  it('same seed twice yields identical arrays', () => {
    const again = generateSkull({ seed: SKULL_SEED });
    expect(again.count).toBe(full.count);
    expect(again.positions).toEqual(full.positions);
    expect(again.tone).toEqual(full.tone);
    expect(again.tile).toEqual(full.tile);
    expect(again.flat).toEqual(full.flat);
    expect(again.color).toEqual(full.color);
  });

  it('a different seed leaves the pre-dropout core unchanged but fragments differently', () => {
    const otherCore = generateSkull({ seed: 7, dropout: false });
    expect(otherCore.positions).toEqual(core.positions);
    const otherFull = generateSkull({ seed: 7 });
    expect(otherFull.positions).not.toEqual(full.positions);
    expect(skullCount(otherFull)).not.toBe(skullCount(full));
  });
});

describe('symmetry', () => {
  it('the pre-dropout core is closed under the X mirror 47 - x', () => {
    const keys = keysOf(core);
    expect(keys.size).toBe(skullCount(core));
    for (let i = 0; i < core.count; i++) {
      if (core.flat[i] === 1) {
        continue;
      }
      const x = core.positions[3 * i]!;
      const y = core.positions[3 * i + 1]!;
      const z = core.positions[3 * i + 2]!;
      expect(keys.has(key(47 - x, y, z))).toBe(true);
    }
  });

  it('the final set (with dropout) is symmetric as well', () => {
    const keys = keysOf(full);
    expect(keys.size).toBe(skullCount(full));
    for (const k of keys) {
      const [x, y, z] = k.split(',').map(Number) as [number, number, number];
      expect(keys.has(key(47 - x, y, z))).toBe(true);
    }
  });
});

describe('sockets, nose and shell-only', () => {
  it('no skull voxel lies inside an eye socket or the nasal cavity', () => {
    let checked = 0;
    for (let i = 0; i < full.count; i++) {
      if (full.flat[i] === 1) {
        continue;
      }
      checked++;
      const cx = full.positions[3 * i]! - CENTER[0];
      const cy = full.positions[3 * i + 1]! - CENTER[1];
      const cz = full.positions[3 * i + 2]! - CENTER[2];
      expect(inEyeSocket(cx, cy, cz)).toBe(false);
      expect(inNasalCavity(cx, cy, cz)).toBe(false);
    }
    expect(checked).toBe(skullCount(full));
  });

  it('every instance has at least one empty 6-neighbor in the full pre-shell volume', () => {
    const solid = buildSolidVolume();
    const solidAt = (x: number, y: number, z: number): boolean =>
      x >= 0 && y >= 0 && z >= 0 && x < 48 && y < 56 && z < 44 && solid[voxelIndex(x, y, z, 48, 56)] === 1;
    expect(skullCount(full)).toBeGreaterThan(0);
    for (let i = 0; i < full.count; i++) {
      if (full.flat[i] === 1) {
        continue;
      }
      const x = full.positions[3 * i]!;
      const y = full.positions[3 * i + 1]!;
      const z = full.positions[3 * i + 2]!;
      expect(solidAt(x, y, z)).toBe(true);
      const hasEmpty =
        !solidAt(x - 1, y, z) ||
        !solidAt(x + 1, y, z) ||
        !solidAt(x, y - 1, z) ||
        !solidAt(x, y + 1, z) ||
        !solidAt(x, y, z - 1) ||
        !solidAt(x, y, z + 1);
      expect(hasEmpty).toBe(true);
    }
  });

  it('the solid volume contains interior voxels that are not emitted', () => {
    const solid = buildSolidVolume();
    let solidCount = 0;
    for (const v of solid) {
      solidCount += v;
    }
    expect(solidCount).toBeGreaterThan(skullCount(core) * 2);
  });
});

describe('budget', () => {
  it('instance count is within [3000, 12000]', () => {
    expect(full.count).toBeGreaterThanOrEqual(3000);
    expect(full.count).toBeLessThanOrEqual(12000);
    expect(core.count).toBeLessThanOrEqual(12000);
    expect(skullCount(full)).toBeLessThan(skullCount(core));
  });
});

describe('fragmentation', () => {
  it('probability is 0 up to the start radius and rises monotonically to the maximum', () => {
    expect(dropoutProbability(0)).toBe(0);
    expect(dropoutProbability(DROPOUT_START_RADIUS)).toBe(0);
    expect(dropoutProbability(0.9)).toBeGreaterThan(0);
    expect(dropoutProbability(0.95)).toBeGreaterThan(dropoutProbability(0.9));
    expect(dropoutProbability(1)).toBeCloseTo(DROPOUT_MAX_PROBABILITY, 12);
    expect(dropoutProbability(1.5)).toBe(DROPOUT_MAX_PROBABILITY);
  });

  it('never drops a core voxel inside the protected face zone', () => {
    const finalKeys = keysOf(full);
    let protectedCount = 0;
    for (let i = 0; i < core.count; i++) {
      if (core.flat[i] === 1) {
        continue;
      }
      const x = core.positions[3 * i]!;
      const y = core.positions[3 * i + 1]!;
      const z = core.positions[3 * i + 2]!;
      if (isProtectedZone(x - CENTER[0], y - CENTER[1], z - CENTER[2])) {
        protectedCount++;
        expect(finalKeys.has(key(x, y, z))).toBe(true);
      }
    }
    expect(protectedCount).toBeGreaterThan(500);
  });

  it('drops more toward the edge than near the start radius', () => {
    const finalKeys = keysOf(full);
    const bands = [
      { lo: DROPOUT_START_RADIUS, hi: 1, total: 0, dropped: 0 },
      { lo: 1, hi: 10, total: 0, dropped: 0 },
    ];
    for (let i = 0; i < core.count; i++) {
      if (core.flat[i] === 1) {
        continue;
      }
      const x = core.positions[3 * i]!;
      const y = core.positions[3 * i + 1]!;
      const z = core.positions[3 * i + 2]!;
      const cx = x - CENTER[0];
      const cy = y - CENTER[1];
      const cz = z - CENTER[2];
      if (isProtectedZone(cx, cy, cz)) {
        continue;
      }
      const r = normalizedRadius(cx, cy, cz);
      for (const band of bands) {
        if (r >= band.lo && r < band.hi) {
          band.total++;
          if (!finalKeys.has(key(x, y, z))) {
            band.dropped++;
          }
        }
      }
    }
    const [mid, outer] = bands as [(typeof bands)[number], (typeof bands)[number]];
    expect(mid.total).toBeGreaterThan(100);
    expect(outer.total).toBeGreaterThan(100);
    expect(mid.dropped / mid.total).toBeGreaterThan(0);
    expect(outer.dropped / outer.total).toBeGreaterThan(mid.dropped / mid.total);
    expect(outer.dropped / outer.total).toBeLessThan(DROPOUT_MAX_PROBABILITY + 0.05);
  });
});

describe('generation time (informational)', () => {
  it('generates the full skull well under the generous 500 ms ceiling', () => {
    generateSkull(); // warm-up (JIT)
    const runs: number[] = [];
    for (let i = 0; i < 5; i++) {
      const t0 = performance.now();
      generateSkull();
      runs.push(performance.now() - t0);
    }
    runs.sort((a, b) => a - b);
    const median = runs[2]!;
    console.info(`[voxel] generateSkull median ${median.toFixed(1)} ms (runs: ${runs.map((r) => r.toFixed(1)).join(', ')})`);
    expect(median).toBeLessThan(500);
  });
});
