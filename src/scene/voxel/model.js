import { COLORS } from '../../styles/tokens.js';

/** Gray tokens a skull voxel can take; `tone` indexes this tuple. */
export const TONE_TOKENS = ['gray-200', 'bg-alt', 'gray-400', 'gray-700'];

/**
 * @typedef {object} VoxelModel
 * @property {{ readonly w: 48; readonly h: 56; readonly d: 44 }} size
 * @property {number} count
 * @property {Int16Array} positions - Grid coordinates, xyz triples.
 * @property {Uint8Array} tone - Index into `TONE_TOKENS` (0 for accents, which use `color` directly).
 * @property {Uint8Array} tile - Atlas tile 0..7.
 * @property {Uint8Array} flat - 1 = accent cube rendered unlit with its exact color.
 * @property {Uint8Array} color - Per-instance sRGB bytes (xyz triples), from the tokens.
 */

export function hexToRgb(hex) {
  const value = Number.parseInt(hex.slice(1), 16);
  return [(value >> 16) & 0xff, (value >> 8) & 0xff, value & 0xff];
}

export function toneRgb(tone) {
  const token = TONE_TOKENS[tone];
  if (token === undefined) {
    throw new RangeError(`tone out of range: ${tone}`);
  }
  return hexToRgb(COLORS[token]);
}
