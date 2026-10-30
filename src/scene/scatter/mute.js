import { COLORS } from '../../styles/tokens.js';
import { SCATTER_MUTE_DESATURATE, SCATTER_MUTE_LIGHTEN } from '../constants.js';

/** Rec. 709 luma weights, the same ones the fragment patch uses. */
const LUMA = [0.2126, 0.7152, 0.0722];

function channels(hex) {
  const value = Number.parseInt(hex.slice(1), 16);
  return [(value >> 16) & 0xff, (value >> 8) & 0xff, value & 0xff];
}

const mix = (a, b, t) => a * (1 - t) + b * t;

/**
 * TypeScript reference of the fragment mute (sRGB bytes): desaturate toward the luma by
 * `desaturate`, mix toward the page background by `lighten`, then blend with the input by
 * `amount` (`1 - e` in the shader). Amount 0 returns the input unchanged.
 */
export function mutedColor(
  hex,
  amount,
  desaturate = SCATTER_MUTE_DESATURATE,
  lighten = SCATTER_MUTE_LIGHTEN,
) {
  const rgb = channels(hex);
  const bg = channels(COLORS.bg);
  const luma = LUMA[0] * rgb[0] + LUMA[1] * rgb[1] + LUMA[2] * rgb[2];
  const out = rgb.map((byte, i) => {
    const muted = mix(mix(byte, luma, desaturate), bg[i], lighten);
    return Math.round(mix(byte, muted, amount));
  });
  return `#${out.map((byte) => byte.toString(16).padStart(2, '0')).join('').toUpperCase()}`;
}
