import {
  GLASS_FILTER_ID,
  GLASS_LIVE_ENABLED,
  GLASS_PERF_BUDGET_MS,
  GLASS_PERF_SAMPLES,
  GLASS_PERF_STALL_MS,
  GLASS_WINDOW_MARGIN_PX,
} from './constants.js';

/**
 * The panel's box in document coordinates (viewport box plus the scroll offsets).
 *
 * @typedef {object} PanelBox
 * @property {number} left
 * @property {number} top
 * @property {number} width
 * @property {number} height
 */

/**
 * @typedef {object} GlassWindowRect
 * @property {number} left
 * @property {number} width
 * @property {number} top - Viewport-relative top of the fixed window.
 * @property {number} height
 * @property {number} copyX - Translation that keeps the viewport copy aligned with the viewport.
 * @property {number} copyY
 * @property {boolean} visible
 */

/**
 * Geometry of the fixed glass window (design Decision 37): the panel's horizontal extent,
 * clipped vertically to the viewport plus a margin so the edge blur never reveals an
 * artificial edge. In the middle of the panel `top` and `height` are constant, so scrolling
 * writes nothing; only near the panel ends does the window track the panel.
 */
export function glassWindowRect(
  panel,
  scrollY,
  viewport,
  margin = GLASS_WINDOW_MARGIN_PX,
) {
  const panelTop = panel.top - scrollY;
  const top = Math.max(panelTop, -margin);
  const bottom = Math.min(panelTop + panel.height, viewport.h + margin);
  const height = Math.max(0, bottom - top);
  return {
    left: panel.left,
    width: panel.width,
    top,
    height,
    copyX: -panel.left,
    copyY: -top,
    visible: height > 0,
  };
}

/**
 * @typedef {object} GlassModeInput
 * @property {boolean} reducedMotion
 * @property {SceneStatus} sceneStatus
 * @property {boolean} filterSupported
 * @property {boolean} degraded
 * @property {boolean} [touchOnly] - Touch-only devices always get frost (mobile first, 2026-10-31).
 * @property {boolean} [enabled] - Kill switch; defaults to `GLASS_LIVE_ENABLED`.
 */

/** Live only with a ready scene, supported filter, normal motion, an acceptable frame time and a non-touch-only device. */
export function resolveGlassMode(input) {
  const { reducedMotion, sceneStatus, filterSupported, degraded, touchOnly = false, enabled = GLASS_LIVE_ENABLED } = input;
  const live = enabled && !reducedMotion && !degraded && !touchOnly && filterSupported && sceneStatus === 'ready';
  return live ? 'live' : 'frost';
}

/**
 * True when at least `minSamples` continuous intervals (stalls of 200 ms or more excluded)
 * have a median above the budget.
 */
export function shouldDegradeGlass(
  intervalsMs,
  budgetMs = GLASS_PERF_BUDGET_MS,
  minSamples = GLASS_PERF_SAMPLES,
) {
  const valid = intervalsMs.filter((interval) => interval < GLASS_PERF_STALL_MS).sort((a, b) => a - b);
  if (valid.length < minSamples) {
    return false;
  }
  const mid = valid.length >> 1;
  const median = valid.length % 2 === 1 ? valid[mid] : (valid[mid - 1] + valid[mid]) / 2;
  return median > budgetMs;
}

/**
 * Whether the browser accepts a same-document SVG filter reference on an HTML element. This is
 * necessary, not sufficient: it does not prove the engine renders the displacement correctly.
 */
export function supportsGlassFilter() {
  return typeof CSS !== 'undefined' && typeof CSS.supports === 'function' && CSS.supports('filter', `url("#${GLASS_FILTER_ID}")`);
}
