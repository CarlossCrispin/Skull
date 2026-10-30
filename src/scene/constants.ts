/**
 * Fraction of min(containerW, containerH) taken by the centered square stage. 1.0 is the fill
 * framing: the model frame spans the full short side. 0.84 leaves 8 % of the short side free above
 * and below the skull (user review 2026-10-27; DEFAULT-PENDING visual check).
 */
export const STAGE_SCALE = 0.84;

/** Upper bound for the renderer pixel ratio. */
export const MAX_DPR = 2;

/**
 * Draws the static wireframe cage around the skull (1 extra draw call).
 * Confirmed ON by the user (D5). Flipping it requires regenerating the poster.
 */
export const LATTICE_ENABLED = true;

/**
 * Scroll-assembly scatter and layout tunables (spec: voxel-skull-scene).
 * All DEFAULT-PENDING until the visual checkpoint.
 */

/** Seed of the scatter layout (same seed, same layout). */
export const SCATTER_SEED = 0x5ca77e4;
/** DEFAULT-PENDING: share of cubes scattered inside the viewport (the rest fly in from outside). */
export const SCATTER_ONSCREEN_SHARE = 0.05;
/** DEFAULT-PENDING: scattered cubes desaturate toward their luma by this much. */
export const SCATTER_MUTE_DESATURATE = 0.7;
/** DEFAULT-PENDING: scattered cubes mix toward the page background by this much (must stay >= 0.5). */
export const SCATTER_MUTE_LIGHTEN = 0.55;
/** DEFAULT-PENDING: scatter depth range in world units toward the viewer (negative = farther). */
export const SCATTER_DZ_MIN = -160;
export const SCATTER_DZ_MAX = 30;
/** A height-only change below this fraction of the previous height does not resize the renderer. */
export const RESIZE_HEIGHT_TOLERANCE = 0.15;
