/**
 * Liquid glass tunables (spec: "Liquid glass panel"). Values marked
 * DEFAULT-PENDING await the visual check; change them here without touching the logic.
 */

/** Id of the SVG refraction filter (WU16); the only `filter` the stylesheet may reference. */
export const GLASS_FILTER_ID = 'liquid-glass-refraction';

/** Share of `--color-bg` in the frost layer, in percent (mirrors `glass-frost`; DEFAULT-PENDING). */
export const GLASS_FROST_PERCENT = 72;

/** Extra pixels the glass window extends past the viewport (> 3 sigma of the 45 px edge blur; DEFAULT-PENDING). */
export const GLASS_WINDOW_MARGIN_PX = 160;

/** Pixel ratio of the viewport copy; 1 keeps the filtered surface cheap (as in the reference). */
export const GLASS_COPY_PIXEL_RATIO = 1;

/**
 * Extra copy pixels on every side of the viewport, so the effect's own edge bands fall outside the
 * visible area. Band reach: the edge mask is nonzero about 0.74 sigma (33 px) inside the copy edge
 * (blur sigma 45, slope -1.3) plus a displacement of up to 65 / 2 = 32.5 px, so about 66 px. The card
 * keeps at least a 20 px gutter from the left and right viewport edges (46 px needed there) but its
 * ends scroll to the top and bottom edges (the full 66 px needed), so 96 = 66 + 30 safety. Costs
 * 1.39x the pixels at 1324 x 898 (was 1.68x at 160; DEFAULT-PENDING visual check).
 */
export const GLASS_COPY_OVERSCAN_PX = 96;

/** Length of the diagonal cut at the card's top-left and bottom-right corners, in px (DEFAULT-PENDING). */
export const GLASS_CHAMFER_PX = 20;

/** Arm length of the L-shaped bracket marks on the two square corners, in px (DEFAULT-PENDING). */
export const GLASS_BRACKET_ARM_PX = 14;

/** Distance of the bracket marks from the card edges, in px (DEFAULT-PENDING). */
export const GLASS_BRACKET_INSET_PX = 6;

/** Median frame interval above which live glass degrades to frost, in ms (below 40 fps; DEFAULT-PENDING). */
export const GLASS_PERF_BUDGET_MS = 25;

/** Continuous frame intervals needed before the performance guard may degrade (DEFAULT-PENDING). */
export const GLASS_PERF_SAMPLES = 30;

/** Intervals at or above this are stalls (tab switch, hitch), not rendering cost, and are ignored. */
export const GLASS_PERF_STALL_MS = 200;

/** Kill switch: false restores the frost-only panel everywhere. */
export const GLASS_LIVE_ENABLED = true;
