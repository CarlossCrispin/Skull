import { deflateSync } from 'node:zlib';

/**
 * An 8-bit indexed image; palette index 0 is the transparent background.
 *
 * @typedef {object} IndexedImage
 * @property {number} width
 * @property {number} height
 * @property {readonly Rgb[]} palette
 * @property {Uint8Array} pixels - One palette index per pixel, row-major.
 */

const SIGNATURE = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const MAX_PALETTE = 256;
const BIT_DEPTH = 8;
const COLOR_TYPE_INDEXED = 3;

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

/** CRC-32 (ISO 3309 / PNG) of `data`. */
export function crc32(data) {
  let c = 0xffffffff;
  for (const byte of data) {
    c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const out = new Uint8Array(12 + data.length);
  const view = new DataView(out.buffer);
  view.setUint32(0, data.length);
  for (let i = 0; i < 4; i++) {
    out[4 + i] = type.charCodeAt(i);
  }
  out.set(data, 8);
  view.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)));
  return out;
}

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) {
    return a;
  }
  return pb <= pc ? b : c;
}

/** Predictors for filter types 0 (None) .. 4 Paeth. */
const PREDICTORS = [
  () => 0,
  (left) => left,
  (_left, up) => up,
  (left, up) => (left + up) >> 1,
  paeth,
];

/** Filters one scanline with `filter`; returns the filtered bytes (without the type byte). */
function filterRow(pixels, width, y, filter) {
  const predict = PREDICTORS[filter];
  const row = new Uint8Array(width);
  for (let x = 0; x < width; x++) {
    const left = x > 0 ? pixels[y * width + x - 1] : 0;
    const up = y > 0 ? pixels[(y - 1) * width + x] : 0;
    const upLeft = x > 0 && y > 0 ? pixels[(y - 1) * width + x - 1] : 0;
    row[x] = (pixels[y * width + x] - predict(left, up, upLeft)) & 0xff;
  }
  return row;
}

/** Sum of absolute signed residuals: the usual heuristic for the best filter. */
function filterCost(row) {
  let cost = 0;
  for (const byte of row) {
    cost += byte < 128 ? byte : 256 - byte;
  }
  return cost;
}

function filteredScanlines(pixels, width, height) {
  const out = new Uint8Array(height * (width + 1));
  for (let y = 0; y < height; y++) {
    let best = filterRow(pixels, width, y, 0);
    let bestFilter = 0;
    let bestCost = filterCost(best);
    for (let filter = 1; filter < PREDICTORS.length; filter++) {
      const candidate = filterRow(pixels, width, y, filter);
      const cost = filterCost(candidate);
      if (cost < bestCost) {
        best = candidate;
        bestFilter = filter;
        bestCost = cost;
      }
    }
    out[y * (width + 1)] = bestFilter;
    out.set(best, y * (width + 1) + 1);
  }
  return out;
}

/**
 * Encodes an 8-bit indexed PNG. Palette index 0 is fully transparent (`tRNS`
 * alpha 0) and all other entries are opaque, so edges are hard by construction.
 * Deterministic: same input, same bytes (for a given zlib build).
 */
export function encodeIndexedPng(image) {
  const { width, height, palette, pixels } = image;
  if (palette.length < 1 || palette.length > MAX_PALETTE) {
    throw new RangeError(`palette must hold 1..${MAX_PALETTE} entries, got ${palette.length}`);
  }
  if (pixels.length !== width * height) {
    throw new RangeError(`expected ${width * height} pixels, got ${pixels.length}`);
  }
  for (const index of pixels) {
    if (index >= palette.length) {
      throw new RangeError(`pixel index ${index} is outside the ${palette.length}-entry palette`);
    }
  }

  const ihdr = new Uint8Array(13);
  const ihdrView = new DataView(ihdr.buffer);
  ihdrView.setUint32(0, width);
  ihdrView.setUint32(4, height);
  ihdr[8] = BIT_DEPTH;
  ihdr[9] = COLOR_TYPE_INDEXED;

  const plte = Uint8Array.from(palette.flatMap((rgb) => [...rgb]));
  const trns = Uint8Array.from(palette, (_, i) => (i === 0 ? 0 : 255));
  const idat = deflateSync(filteredScanlines(pixels, width, height), { level: 9 });

  const parts = [
    SIGNATURE,
    chunk('IHDR', ihdr),
    chunk('PLTE', plte),
    chunk('tRNS', trns),
    chunk('IDAT', idat),
    chunk('IEND', new Uint8Array(0)),
  ];
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const part of parts) {
    out.set(part, at);
    at += part.length;
  }
  return out;
}
