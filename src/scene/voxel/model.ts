import { COLORS, type ColorToken } from '../../styles/tokens.ts';

/** Gray tokens a skull voxel can take; `tone` indexes this tuple. */
export const TONE_TOKENS = ['gray-200', 'bg-alt', 'gray-400', 'gray-700'] as const satisfies readonly ColorToken[];

export interface VoxelModel {
  readonly size: { readonly w: 48; readonly h: 56; readonly d: 44 };
  readonly count: number;
  /** Grid coordinates, xyz triples. */
  readonly positions: Int16Array;
  /** Index into `TONE_TOKENS` (0 for accents, which use `color` directly). */
  readonly tone: Uint8Array;
  /** Atlas tile 0..7. */
  readonly tile: Uint8Array;
  /** 1 = accent cube rendered unlit with its exact color. */
  readonly flat: Uint8Array;
  /** Per-instance sRGB bytes (xyz triples), from the tokens. */
  readonly color: Uint8Array;
}

export function hexToRgb(hex: string): [number, number, number] {
  const value = Number.parseInt(hex.slice(1), 16);
  return [(value >> 16) & 0xff, (value >> 8) & 0xff, value & 0xff];
}

export function toneRgb(tone: number): [number, number, number] {
  const token = TONE_TOKENS[tone];
  if (token === undefined) {
    throw new RangeError(`tone out of range: ${tone}`);
  }
  return hexToRgb(COLORS[token]);
}
