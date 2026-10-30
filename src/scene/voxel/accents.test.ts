import { describe, expect, it } from 'vitest';
import {
  ACCENT_CUBES_PER_SOCKET,
  ACCENT_VIEWER_LEFT_HEX,
  ACCENT_VIEWER_RIGHT_HEX,
  accentCubes,
} from './accents.ts';
import { generateSkull } from './generate.ts';
import { hexToRgb } from './model.ts';
import { inEyeSocket } from './skullSdf.ts';

const CENTER = [23.5, 27.5, 21.5] as const;

describe('accent constants', () => {
  it('use the approved token hexes: viewer-left violet, viewer-right cempasuchil', () => {
    expect(ACCENT_VIEWER_LEFT_HEX).toBe('#8E4AF2');
    expect(ACCENT_VIEWER_RIGHT_HEX).toBe('#E2680A');
    expect(ACCENT_CUBES_PER_SOCKET).toBe(3);
  });
});

describe('accentCubes', () => {
  const cubes = accentCubes();

  it('returns 3 violet cubes on the viewer-left (small x) and 3 orange on the viewer-right', () => {
    const left = cubes.filter((c) => c.hex === '#8E4AF2');
    const right = cubes.filter((c) => c.hex === '#E2680A');
    expect(cubes).toHaveLength(6);
    expect(left).toHaveLength(3);
    expect(right).toHaveLength(3);
    expect(left.every((c) => c.x < 24)).toBe(true);
    expect(right.every((c) => c.x >= 24)).toBe(true);
  });

  it('are mirrored about the sagittal plane (x -> 47 - x), same y and z', () => {
    const rightKeys = new Set(cubes.filter((c) => c.hex === '#E2680A').map((c) => `${c.x},${c.y},${c.z}`));
    for (const c of cubes.filter((c) => c.hex === '#8E4AF2')) {
      expect(rightKeys.has(`${47 - c.x},${c.y},${c.z}`)).toBe(true);
    }
  });

  it('are distinct cells inside the eye-socket volumes', () => {
    expect(new Set(cubes.map((c) => `${c.x},${c.y},${c.z}`)).size).toBe(6);
    for (const c of cubes) {
      expect(inEyeSocket(c.x - CENTER[0], c.y - CENTER[1], c.z - CENTER[2])).toBe(true);
    }
  });

  it('are deterministic', () => {
    expect(accentCubes()).toEqual(cubes);
  });
});

describe('accents in the generated model', () => {
  for (const dropout of [true, false]) {
    it(`flat = 1, exact colors, counted in the budget, never overlapping skull voxels (dropout ${dropout})`, () => {
      const model = generateSkull({ dropout });
      const skull = generateSkull({ dropout }).count;
      const accentIdx: number[] = [];
      const skullKeys = new Set<string>();
      for (let i = 0; i < model.count; i++) {
        const k = `${model.positions[3 * i]},${model.positions[3 * i + 1]},${model.positions[3 * i + 2]}`;
        if (model.flat[i] === 1) {
          accentIdx.push(i);
        } else {
          skullKeys.add(k);
        }
      }
      expect(accentIdx).toHaveLength(6);
      expect(skullKeys.size).toBe(skull - 6);
      expect(model.count).toBeLessThanOrEqual(12000);
      let violet = 0;
      let orange = 0;
      for (const i of accentIdx) {
        const rgb = [model.color[3 * i], model.color[3 * i + 1], model.color[3 * i + 2]];
        const x = model.positions[3 * i]!;
        if (x < 24) {
          violet++;
          expect(rgb).toEqual(hexToRgb('#8E4AF2'));
        } else {
          orange++;
          expect(rgb).toEqual(hexToRgb('#E2680A'));
        }
        expect(skullKeys.has(`${model.positions[3 * i]},${model.positions[3 * i + 1]},${model.positions[3 * i + 2]}`)).toBe(false);
      }
      expect([violet, orange]).toEqual([3, 3]);
    });
  }

  it('skull voxels keep flat = 0 and the accent block is deterministic', () => {
    const a = generateSkull();
    const b = generateSkull();
    expect(a.flat.reduce((n, v) => n + v, 0)).toBe(6);
    expect(a.color).toEqual(b.color);
    expect(a.positions).toEqual(b.positions);
  });
});
