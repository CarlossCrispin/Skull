
/**
 * @typedef {object} BarcodeLayout
 * @property {BarcodeBar[]} bars
 * @property {number} width - Total width in bar units, trailing gap excluded.
 */

const DEFAULT_BAR_COUNT = 48;

/** FNV-1a: a small string hash, enough to seed the generator. */
function hashSeed(seed) {
  let hash = 0x811c9dc5;
  for (const char of seed) {
    hash = Math.imul(hash ^ char.charCodeAt(0), 0x01000193) >>> 0;
  }
  return hash;
}

/** mulberry32: a tiny deterministic generator returning floats in [0, 1). */
function mulberry32(seed) {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Deterministic barcode layout from a string seed: `count` bars 1 to 4 units wide, separated by
 * gaps of 1 or 2 units. The same seed always yields the same layout.
 */
export function barcodeBars(seed, count = DEFAULT_BAR_COUNT) {
  const random = mulberry32(hashSeed(seed));
  const bars = [];
  let x = 0;
  for (let i = 0; i < count; i++) {
    const width = 1 + Math.floor(random() * 4);
    bars.push({ x, width });
    x += width + 1 + Math.floor(random() * 2);
  }
  const last = bars[bars.length - 1];
  return { bars, width: last === undefined ? 0 : last.x + last.width };
}
