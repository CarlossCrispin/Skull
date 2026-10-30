import { accentCubes } from './accents.ts';
import { hash3 } from './prng.ts';
import { hexToRgb, toneRgb, type VoxelModel } from './model.ts';
import { extractShell, voxelIndex } from './shell.ts';
import { CENTER, GRID_D, GRID_H, GRID_W, cavityDistance, skullSdf } from './skullSdf.ts';

/** Default generator seed (named constant, never inlined). */
export const SKULL_SEED = 20261102;

/** DEFAULT-PENDING tunables for the seeded edge fragmentation. */
export const DROPOUT_START_RADIUS = 0.75;
export const DROPOUT_MAX_PROBABILITY = 0.45;

/** Cavity-lining voxels (within this distance of a subtracted volume) get the darkest gray. */
const LINING_DISTANCE = 1.5;
const PROTECT_CAVITY_DISTANCE = 3;
/** Temple band: the outer skin beside the sockets stays intact so the hollow lining is never exposed from the side. */
const TEMPLE_CENTER_Y = 0.5;
const TEMPLE_HALF_HEIGHT = 9;
const TEMPLE_BACK_Z = -13;
const FRONT_PROTECT_Z = 3;
const LINING_TONE = 3;

const TILE_COUNT = 8;
const SEED_TILE = 1;
const SEED_TONE = 2;

export interface GenerateOptions {
  seed?: number;
  /** Seeded edge fragmentation; `false` returns the symmetric core. */
  dropout?: boolean;
}

/** Full solid occupancy (pre-shell), evaluated on every grid cell center. */
export function buildSolidVolume(): Uint8Array {
  const solid = new Uint8Array(GRID_W * GRID_H * GRID_D);
  for (let z = 0; z < GRID_D; z++) {
    for (let y = 0; y < GRID_H; y++) {
      for (let x = 0; x < GRID_W; x++) {
        if (skullSdf(x - CENTER[0], y - CENTER[1], z - CENTER[2]) <= 0) {
          solid[voxelIndex(x, y, z, GRID_W, GRID_H)] = 1;
        }
      }
    }
  }
  return solid;
}

/** Radial distance from the model center, normalized so the bounding ellipsoid is 1. */
export function normalizedRadius(cx: number, cy: number, cz: number): number {
  return Math.hypot(cx / 22, (cy - 1) / 27, (cz + 1) / 20);
}

/** Dropout probability: 0 up to the start radius, then quadratic to the maximum at radius 1. */
export function dropoutProbability(radius: number): number {
  if (radius <= DROPOUT_START_RADIUS) {
    return 0;
  }
  const t = Math.min((radius - DROPOUT_START_RADIUS) / (1 - DROPOUT_START_RADIUS), 1);
  return DROPOUT_MAX_PROBABILITY * t * t;
}

/**
 * The whole front hemisphere, the jaw and the cavity rims are never fragmented, so the
 * front view has no see-through speckle; fragmentation lives on the silhouette edge, top and back.
 */
export function isProtectedZone(cx: number, cy: number, cz: number): boolean {
  const temple = Math.abs(cy - TEMPLE_CENTER_Y) <= TEMPLE_HALF_HEIGHT && cz >= TEMPLE_BACK_Z;
  return cy <= -6 || cz >= FRONT_PROTECT_Z || temple || cavityDistance(cx, cy, cz) < PROTECT_CAVITY_DISTANCE;
}

function chooseTone(x: number, y: number, z: number, cx: number, cy: number, cz: number, seed: number): number {
  if (cavityDistance(cx, cy, cz) < LINING_DISTANCE) {
    return LINING_TONE;
  }
  const h = hash3(Math.min(x, GRID_W - 1 - x), y, z, seed + SEED_TONE);
  if (h < 0.5) {
    return 1;
  }
  return h < 0.88 ? 0 : 2;
}

export function generateSkull(options: GenerateOptions = {}): VoxelModel {
  const seed = options.seed ?? SKULL_SEED;
  const dropout = options.dropout ?? true;
  const solid = buildSolidVolume();
  const kept: number[] = [];

  for (const index of extractShell(solid, GRID_W, GRID_H, GRID_D)) {
    if (dropout) {
      const x = index % GRID_W;
      const y = Math.floor(index / GRID_W) % GRID_H;
      const z = Math.floor(index / (GRID_W * GRID_H));
      const cx = x - CENTER[0];
      const cy = y - CENTER[1];
      const cz = z - CENTER[2];
      const p = isProtectedZone(cx, cy, cz) ? 0 : dropoutProbability(normalizedRadius(cx, cy, cz));
      if (p > 0 && hash3(Math.min(x, GRID_W - 1 - x), y, z, seed) < p) {
        continue;
      }
    }
    kept.push(index);
  }

  const accents = accentCubes();
  const skullCount = kept.length;
  const count = skullCount + accents.length;
  const positions = new Int16Array(count * 3);
  const tone = new Uint8Array(count);
  const tile = new Uint8Array(count);
  const flat = new Uint8Array(count);
  const color = new Uint8Array(count * 3);

  kept.forEach((index, i) => {
    const x = index % GRID_W;
    const y = Math.floor(index / GRID_W) % GRID_H;
    const z = Math.floor(index / (GRID_W * GRID_H));
    positions[3 * i] = x;
    positions[3 * i + 1] = y;
    positions[3 * i + 2] = z;
    const t = chooseTone(x, y, z, x - CENTER[0], y - CENTER[1], z - CENTER[2], seed);
    tone[i] = t;
    tile[i] = Math.floor(hash3(Math.min(x, GRID_W - 1 - x), y, z, seed + SEED_TILE) * TILE_COUNT);
    const [r, g, b] = toneRgb(t);
    color[3 * i] = r;
    color[3 * i + 1] = g;
    color[3 * i + 2] = b;
  });

  accents.forEach((accent, j) => {
    const i = skullCount + j;
    positions[3 * i] = accent.x;
    positions[3 * i + 1] = accent.y;
    positions[3 * i + 2] = accent.z;
    flat[i] = 1;
    const [r, g, b] = hexToRgb(accent.hex);
    color[3 * i] = r;
    color[3 * i + 1] = g;
    color[3 * i + 2] = b;
  });

  return { size: { w: 48, h: 56, d: 44 }, count, positions, tone, tile, flat, color };
}
