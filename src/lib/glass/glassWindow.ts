import type { SceneStatus } from '../../components/skull-hero/useSkullScene.ts';
import {
  GLASS_FILTER_ID,
  GLASS_LIVE_ENABLED,
  GLASS_PERF_BUDGET_MS,
  GLASS_PERF_SAMPLES,
  GLASS_PERF_STALL_MS,
  GLASS_WINDOW_MARGIN_PX,
} from './constants.ts';

/** The panel's box in document coordinates (viewport box plus the scroll offsets). */
export interface PanelBox {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

export interface GlassWindowRect {
  readonly left: number;
  readonly width: number;
  /** Viewport-relative top of the fixed window. */
  readonly top: number;
  readonly height: number;
  /** Translation that keeps the viewport copy aligned with the viewport. */
  readonly copyX: number;
  readonly copyY: number;
  readonly visible: boolean;
}

/**
 * Geometry of the fixed glass window (design Decision 37): the panel's horizontal extent,
 * clipped vertically to the viewport plus a margin so the edge blur never reveals an
 * artificial edge. In the middle of the panel `top` and `height` are constant, so scrolling
 * writes nothing; only near the panel ends does the window track the panel.
 */
export function glassWindowRect(
  panel: PanelBox,
  scrollY: number,
  viewport: { readonly w: number; readonly h: number },
  margin: number = GLASS_WINDOW_MARGIN_PX,
): GlassWindowRect {
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

export type GlassMode = 'live' | 'frost';

export interface GlassModeInput {
  readonly reducedMotion: boolean;
  readonly sceneStatus: SceneStatus;
  readonly filterSupported: boolean;
  readonly degraded: boolean;
  /** Kill switch; defaults to `GLASS_LIVE_ENABLED`. */
  readonly enabled?: boolean;
}

/** Live only with a ready scene, supported filter, normal motion and an acceptable frame time. */
export function resolveGlassMode(input: GlassModeInput): GlassMode {
  const { reducedMotion, sceneStatus, filterSupported, degraded, enabled = GLASS_LIVE_ENABLED } = input;
  const live = enabled && !reducedMotion && !degraded && filterSupported && sceneStatus === 'ready';
  return live ? 'live' : 'frost';
}

/**
 * True when at least `minSamples` continuous intervals (stalls of 200 ms or more excluded)
 * have a median above the budget.
 */
export function shouldDegradeGlass(
  intervalsMs: readonly number[],
  budgetMs: number = GLASS_PERF_BUDGET_MS,
  minSamples: number = GLASS_PERF_SAMPLES,
): boolean {
  const valid = intervalsMs.filter((interval) => interval < GLASS_PERF_STALL_MS).sort((a, b) => a - b);
  if (valid.length < minSamples) {
    return false;
  }
  const mid = valid.length >> 1;
  const median = valid.length % 2 === 1 ? valid[mid]! : (valid[mid - 1]! + valid[mid]!) / 2;
  return median > budgetMs;
}

/**
 * Whether the browser accepts a same-document SVG filter reference on an HTML element. This is
 * necessary, not sufficient: it does not prove the engine renders the displacement correctly.
 */
export function supportsGlassFilter(): boolean {
  return typeof CSS !== 'undefined' && typeof CSS.supports === 'function' && CSS.supports('filter', `url("#${GLASS_FILTER_ID}")`);
}
