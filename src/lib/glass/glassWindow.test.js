import { describe, expect, it } from 'vitest';
import {
  GLASS_CHAMFER_PX,
  GLASS_COPY_OVERSCAN_PX,
  GLASS_COPY_PIXEL_RATIO,
  GLASS_LIVE_ENABLED,
  GLASS_PERF_BUDGET_MS,
  GLASS_PERF_SAMPLES,
  GLASS_WINDOW_MARGIN_PX,
} from './constants.js';
import { glassWindowRect, resolveGlassMode, shouldDegradeGlass } from './glassWindow.js';

describe('glass tuning constants', () => {
  it('keeps the approved defaults', () => {
    expect(GLASS_WINDOW_MARGIN_PX).toBe(160);
    expect(GLASS_COPY_PIXEL_RATIO).toBe(1);
    expect(GLASS_COPY_OVERSCAN_PX).toBe(96);
    expect(GLASS_CHAMFER_PX).toBe(20);
    expect(GLASS_PERF_BUDGET_MS).toBe(25);
    expect(GLASS_PERF_SAMPLES).toBe(30);
    expect(GLASS_LIVE_ENABLED).toBe(true);
  });
});

const VIEWPORT = { w: 1000, h: 800 };
const PANEL = { left: 48, top: 100, width: 900, height: 3000 };

describe('glassWindowRect', () => {
  it('clips the window to the visible part when the panel straddles the bottom edge', () => {
    // scrollY 0: panel spans 100..3100, the window ends at innerHeight + margin = 960.
    const rect = glassWindowRect(PANEL, 0, VIEWPORT);
    expect(rect).toEqual({ left: 48, width: 900, top: 100, height: 860, copyX: -48, copyY: -100, visible: true });
  });

  it('is constant in the middle of the panel: top = -margin, height = innerHeight + 2 margin', () => {
    const rects = [500, 900, 1500, 2000].map((scrollY) => glassWindowRect(PANEL, scrollY, VIEWPORT));
    for (const rect of rects) {
      expect(rect.top).toBe(-160);
      expect(rect.height).toBe(800 + 320);
      expect(rect.copyY).toBe(160);
      expect(rect.visible).toBe(true);
    }
    expect(new Set(rects.map((rect) => JSON.stringify(rect))).size).toBe(1);
  });

  it('tracks the panel bottom edge when it straddles the top of the viewport', () => {
    // scrollY 3000: panel spans -2900..100, so the window runs from -margin to 100.
    const rect = glassWindowRect(PANEL, 3000, VIEWPORT);
    expect(rect).toEqual({ left: 48, width: 900, top: -160, height: 260, copyX: -48, copyY: 160, visible: true });
  });

  it('is not visible when the panel is fully above the margin', () => {
    // scrollY 4000: panel bottom at -900, beyond the 160 px margin.
    expect(glassWindowRect(PANEL, 4000, VIEWPORT).visible).toBe(false);
  });

  it('is not visible when the panel is fully below the margin', () => {
    const rect = glassWindowRect({ ...PANEL, top: 2000 }, 0, VIEWPORT);
    expect(rect.visible).toBe(false);
    expect(rect.height).toBe(0);
  });

  it('is visible while the panel is inside the margin band only', () => {
    // top at 900 (just below the viewport, inside the 160 px margin): 900..960.
    const rect = glassWindowRect({ ...PANEL, top: 900 }, 0, VIEWPORT);
    expect(rect.visible).toBe(true);
    expect(rect.top).toBe(900);
    expect(rect.height).toBe(60);
  });

  it('honors a custom margin', () => {
    const rect = glassWindowRect(PANEL, 1000, VIEWPORT, 40);
    expect(rect.top).toBe(-40);
    expect(rect.height).toBe(800 + 80);
    expect(rect.copyY).toBe(40);
  });
});

const READY = {
  reducedMotion: false,
  sceneStatus: 'ready',
  filterSupported: true,
  degraded: false,
};

describe('resolveGlassMode', () => {
  it('is live only when ready with a supported filter, normal motion and no degradation', () => {
    expect(resolveGlassMode(READY)).toBe('live');
    expect(resolveGlassMode({ ...READY, enabled: true })).toBe('live');
  });

  it.each([
    ['reduced motion', { reducedMotion: true }],
    ['scene failed', { sceneStatus: 'failed' }],
    ['context lost', { sceneStatus: 'lost' }],
    ['scene loading', { sceneStatus: 'loading' }],
    ['kill switch off', { enabled: false }],
    ['filter unsupported', { filterSupported: false }],
    ['performance degraded', { degraded: true }],
    ['touch-only device', { touchOnly: true }],
  ])('is frost for %s', (_name, patch) => {
    expect(resolveGlassMode({ ...READY, ...patch })).toBe('frost');
  });

  it('reduced motion wins even when everything else is ready', () => {
    expect(resolveGlassMode({ ...READY, reducedMotion: true, enabled: true })).toBe('frost');
  });
});

const run = (count, ms) => Array.from({ length: count }, () => ms);

describe('shouldDegradeGlass', () => {
  it('is true with 30 intervals whose median exceeds the budget', () => {
    expect(shouldDegradeGlass(run(30, 30))).toBe(true);
  });

  it('is false below the sample count even when every interval is slow', () => {
    expect(shouldDegradeGlass(run(29, 60))).toBe(false);
  });

  it('is false at or below the budget', () => {
    expect(shouldDegradeGlass(run(30, 25))).toBe(false);
    expect(shouldDegradeGlass(run(30, 16.7))).toBe(false);
  });

  it('uses the median, so a few slow outliers do not degrade', () => {
    expect(shouldDegradeGlass([...run(25, 16), ...run(5, 190)])).toBe(false);
  });

  it('uses the median of an even sample set (mean of the two middle values)', () => {
    expect(shouldDegradeGlass([...run(15, 20), ...run(15, 40)])).toBe(true);
    expect(shouldDegradeGlass([...run(15, 10), ...run(15, 40)])).toBe(false);
  });

  it('ignores intervals of 200 ms or more (tab switches and stalls) and counts only the rest', () => {
    expect(shouldDegradeGlass([...run(30, 30), ...run(10, 500)])).toBe(true);
    expect(shouldDegradeGlass([...run(20, 30), ...run(20, 500)])).toBe(false);
    expect(shouldDegradeGlass([...run(30, 30), 200])).toBe(true);
    expect(shouldDegradeGlass([...run(29, 30), 200])).toBe(false);
  });

  it('takes the budget and sample count as parameters', () => {
    expect(shouldDegradeGlass(run(10, 20), 15, 10)).toBe(true);
    expect(shouldDegradeGlass(run(10, 20), 25, 10)).toBe(false);
    expect(shouldDegradeGlass(run(9, 20), 15, 10)).toBe(false);
  });
});
