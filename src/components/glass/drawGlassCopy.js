import { COLORS } from '../../styles/tokens.js';

/** Grid line positions as viewport fractions; they mirror `GridOverlay`. */
export const GRID_FRACTIONS = [0.25, 0.75];

/** Arm length of the `+` crosshairs, as in `GridOverlay` (size-4). */
const CROSSHAIR_PX = 16;

/**
 * Paints the glass copy for one rendered frame (design Decisions 37 and 43): the page background,
 * the grid lines and crosshairs (so the grid refracts through the glass), then the scene
 * canvas at the viewport size. The copy is `overscan` pixels larger than the viewport on every
 * side; the margin holds the background and the grid, and the scene lands at `(overscan, overscan)`
 * so the copy stays 1:1 with the fixed canvas. It must run in the same task as the render that
 * produced `source`, because the WebGL drawing buffer is not preserved. Palette tokens only.
 */
export function drawGlassCopy(
  ctx,
  source,
  vw,
  vh,
  overscan = 0,
) {
  const totalW = vw + 2 * overscan;
  const totalH = vh + 2 * overscan;
  ctx.fillStyle = COLORS.bg;
  ctx.fillRect(0, 0, totalW, totalH);

  ctx.fillStyle = COLORS['gray-200'];
  const xs = GRID_FRACTIONS.map((fraction) => overscan + Math.floor(vw * fraction));
  const ys = GRID_FRACTIONS.map((fraction) => overscan + Math.floor(vh * fraction));
  for (const x of xs) {
    ctx.fillRect(x, 0, 1, totalH);
  }
  for (const y of ys) {
    ctx.fillRect(0, y, totalW, 1);
  }
  const half = CROSSHAIR_PX / 2;
  for (const y of ys) {
    for (const x of xs) {
      ctx.fillRect(x - half, y, CROSSHAIR_PX, 1);
      ctx.fillRect(x, y - half, 1, CROSSHAIR_PX);
    }
  }

  ctx.drawImage(source, overscan, overscan, vw, vh);
}
