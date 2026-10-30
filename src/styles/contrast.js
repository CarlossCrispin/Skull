import { SCATTER_MUTE_DESATURATE } from '../scene/constants.js';
import { mutedColor } from '../scene/scatter/mute.js';
import { COLORS } from './tokens.js';

/** WCAG AA contrast for body text (design-system "Contrast pairing rules"). */
export const MIN_TEXT_CONTRAST = 4.5;

/**
 * Colors a cube can have behind text: violet and orange faces, the shaded greys between
 * `gray-700` and `gray-200`, and a near-black shaded face (the worst case).
 */
export const CUBE_COLORS = [
  COLORS.accent,
  COLORS.signal,
  COLORS['gray-700'],
  '#000000',
  COLORS['gray-200'],
];

function channels(hex) {
  const value = Number.parseInt(hex.slice(1), 16);
  return [(value >> 16) & 0xff, (value >> 8) & 0xff, value & 0xff];
}

function toLinear(byte) {
  const c = byte / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/** WCAG relative luminance of an sRGB `#RRGGBB` color. */
export function relativeLuminance(hex) {
  const [r, g, b] = channels(hex).map(toLinear);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio between two `#RRGGBB` colors, in [1, 21]. */
export function contrastRatio(a, b) {
  const [light, dark] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

/** Share of `--color-bg` the panel's frost layer lays over what is behind it (design Decision 37). */
export const GLASS_FROST_SHARE = 0.72;

/** A color under the glass frost: `GLASS_FROST_SHARE` of the page background over it (sRGB bytes). */
export function frostedOver(hex) {
  const bg = channels(COLORS.bg);
  const mixed = channels(hex).map((byte, i) => Math.round(byte * (1 - GLASS_FROST_SHARE) + (bg[i]) * GLASS_FROST_SHARE));
  return `#${mixed.map((byte) => byte.toString(16).padStart(2, '0')).join('').toUpperCase()}`;
}

/**
 * Worst contrast of body ink over a fully muted cube color (the scatter mute at amount 1),
 * optionally under the glass frost. `lighten` overrides the scene constant to show the bound.
 */
export function worstMutedContrast(frost = false, lighten) {
  return Math.min(
    ...CUBE_COLORS.map((cube) => {
      const muted = mutedColor(cube, 1, SCATTER_MUTE_DESATURATE, lighten);
      return contrastRatio(COLORS.ink, frost ? frostedOver(muted) : muted);
    }),
  );
}
