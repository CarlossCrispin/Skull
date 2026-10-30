import { DataTexture, NearestFilter, NoColorSpace, RGBAFormat, UnsignedByteType } from 'three';
import { mulberry32 } from '../voxel/prng.ts';

export const ATLAS_TILES = 8;
export const ATLAS_TILE_SIZE = 8;
export const ATLAS_WIDTH = ATLAS_TILES * ATLAS_TILE_SIZE;
export const ATLAS_HEIGHT = ATLAS_TILE_SIZE;
export const ATLAS_SEED = 7351;

/** Multiplier range applied on top of the tone so faces read as subtle data texture. */
export const ATLAS_MIN = 0.72;
export const ATLAS_MAX = 1;

type Pattern = (x: number, y: number, rnd: () => number) => number;

/** Tile patterns return 0..1 where 1 is the brightest multiplier. */
const PATTERNS: readonly Pattern[] = [
  // 0 noise
  (_x, _y, rnd) => rnd(),
  // 1 horizontal scanlines
  (_x, y) => (y % 2 === 0 ? 1 : 0.15),
  // 2 bit grid
  (x, y) => ((x % 4 === 0 || y % 4 === 0) ? 0.1 : 0.9),
  // 3 vertical bars
  (x) => (Math.floor(x / 2) % 2 === 0 ? 1 : 0.3),
  // 4 glitch blocks
  (x, y, rnd) => (Math.floor(x / 4) + Math.floor(y / 2)) % 3 === 0 ? 0.2 + 0.3 * rnd() : 0.85 + 0.15 * rnd(),
  // 5 diagonal stripes
  (x, y) => ((x + y) % 4 < 2 ? 1 : 0.25),
  // 6 sparse specks
  (_x, _y, rnd) => (rnd() < 0.18 ? 0.05 : 0.95),
  // 7 near-solid
  (_x, _y, rnd) => 0.92 + 0.08 * rnd(),
];

/** 64x8 grayscale atlas (8 tiles of 8x8) packed in an RGBA DataTexture. */
export function createAtlas(seed: number = ATLAS_SEED): DataTexture {
  const rnd = mulberry32(seed);
  const data = new Uint8Array(ATLAS_WIDTH * ATLAS_HEIGHT * 4);
  for (let tile = 0; tile < ATLAS_TILES; tile++) {
    const pattern = PATTERNS[tile]!;
    for (let y = 0; y < ATLAS_TILE_SIZE; y++) {
      for (let x = 0; x < ATLAS_TILE_SIZE; x++) {
        const level = Math.min(1, Math.max(0, pattern(x, y, rnd)));
        const multiplier = ATLAS_MIN + (ATLAS_MAX - ATLAS_MIN) * level;
        const byte = Math.round(multiplier * 255);
        const i = (y * ATLAS_WIDTH + tile * ATLAS_TILE_SIZE + x) * 4;
        data[i] = byte;
        data[i + 1] = byte;
        data[i + 2] = byte;
        data[i + 3] = 255;
      }
    }
  }
  const texture = new DataTexture(data, ATLAS_WIDTH, ATLAS_HEIGHT, RGBAFormat, UnsignedByteType);
  texture.minFilter = NearestFilter;
  texture.magFilter = NearestFilter;
  texture.generateMipmaps = false;
  texture.colorSpace = NoColorSpace;
  texture.needsUpdate = true;
  return texture;
}
