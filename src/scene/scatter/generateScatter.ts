import {
  SCATTER_DZ_MAX,
  SCATTER_DZ_MIN,
  SCATTER_ONSCREEN_SHARE,
  SCATTER_SEED,
} from '../constants.ts';
import { mulberry32 } from '../voxel/prng.ts';

/** Per-instance attributes: `scatter` is (u, v, dz) triplets, `delay` is one value in [0, 1]. */
export interface ScatterAttributes {
  readonly scatter: Float32Array;
  readonly delay: Float32Array;
}

/** Off-screen ring extent in normalized viewport units (|u| or |v| up to this). */
const RING_EXTENT = 1.6;

/**
 * Seeded scatter layout. `u` and `v` are viewport NDC: `SCATTER_ONSCREEN_SHARE`
 * of the cubes rest anywhere on screen (uniform in [-1, 1], no band), the rest in the
 * ring up to 1.6 so they fly in from outside. `dz` is world units toward the viewer, giving parallax.
 */
export function generateScatter(count: number, seed: number = SCATTER_SEED): ScatterAttributes {
  const rand = mulberry32(seed);
  const scatter = new Float32Array(3 * count);
  const delay = new Float32Array(count);
  const span = (extent: number): number => (rand() * 2 - 1) * extent;
  for (let i = 0; i < count; i += 1) {
    const onScreen = rand() < SCATTER_ONSCREEN_SHARE;
    let u = 0;
    let v = 0;
    if (onScreen) {
      u = span(1);
      v = span(1);
    } else {
      do {
        u = span(RING_EXTENT);
        v = span(RING_EXTENT);
      } while (Math.max(Math.abs(u), Math.abs(v)) <= 1);
    }
    scatter[3 * i] = u;
    scatter[3 * i + 1] = v;
    scatter[3 * i + 2] = SCATTER_DZ_MIN + rand() * (SCATTER_DZ_MAX - SCATTER_DZ_MIN);
    delay[i] = rand();
  }
  return { scatter, delay };
}
