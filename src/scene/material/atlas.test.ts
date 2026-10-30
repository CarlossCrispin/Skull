import { NearestFilter, NoColorSpace, RGBAFormat, UnsignedByteType } from 'three';
import { describe, expect, it } from 'vitest';
import {
  ATLAS_HEIGHT,
  ATLAS_MAX,
  ATLAS_MIN,
  ATLAS_SEED,
  ATLAS_TILES,
  ATLAS_TILE_SIZE,
  ATLAS_WIDTH,
  createAtlas,
} from './atlas.ts';

describe('createAtlas', () => {
  it('builds a 64x8 RGBA unsigned-byte DataTexture', () => {
    expect(ATLAS_TILES * ATLAS_TILE_SIZE).toBe(ATLAS_WIDTH);
    const tex = createAtlas();
    expect(tex.image.width).toBe(64);
    expect(tex.image.height).toBe(8);
    expect(tex.format).toBe(RGBAFormat);
    expect(tex.type).toBe(UnsignedByteType);
    expect((tex.image.data as Uint8Array).length).toBe(ATLAS_WIDTH * ATLAS_HEIGHT * 4);
  });

  it('uses nearest filtering, no mipmaps and no color space', () => {
    const tex = createAtlas();
    expect(tex.minFilter).toBe(NearestFilter);
    expect(tex.magFilter).toBe(NearestFilter);
    expect(tex.generateMipmaps).toBe(false);
    expect(tex.colorSpace).toBe(NoColorSpace);
    expect(tex.version).toBeGreaterThan(0);
  });

  it('is deterministic for the same seed and differs for another seed', () => {
    const a = createAtlas(ATLAS_SEED).image.data as Uint8Array;
    const b = createAtlas(ATLAS_SEED).image.data as Uint8Array;
    const c = createAtlas(ATLAS_SEED + 1).image.data as Uint8Array;
    expect(Array.from(a)).toEqual(Array.from(b));
    expect(Array.from(a)).not.toEqual(Array.from(c));
  });

  it('keeps every texel within the multiplier range with opaque alpha', () => {
    const data = createAtlas().image.data as Uint8Array;
    expect(ATLAS_MIN).toBe(0.72);
    expect(ATLAS_MAX).toBe(1);
    let min = 255;
    let max = 0;
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i]!;
      expect(data[i + 1]).toBe(r);
      expect(data[i + 2]).toBe(r);
      expect(data[i + 3]).toBe(255);
      min = Math.min(min, r);
      max = Math.max(max, r);
    }
    expect(min).toBeGreaterThanOrEqual(Math.floor(ATLAS_MIN * 255));
    expect(max).toBeLessThanOrEqual(255);
    // Patterns are not flat: real variation exists.
    expect(max - min).toBeGreaterThan(20);
  });

  it('gives each tile its own pattern', () => {
    const data = createAtlas().image.data as Uint8Array;
    const tile = (t: number): string => {
      const out: number[] = [];
      for (let y = 0; y < ATLAS_TILE_SIZE; y++) {
        for (let x = 0; x < ATLAS_TILE_SIZE; x++) {
          out.push(data[(y * ATLAS_WIDTH + t * ATLAS_TILE_SIZE + x) * 4]!);
        }
      }
      return out.join(',');
    };
    const unique = new Set(Array.from({ length: ATLAS_TILES }, (_, t) => tile(t)));
    expect(unique.size).toBe(ATLAS_TILES);
  });
});
