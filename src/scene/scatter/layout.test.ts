import { describe, expect, it } from 'vitest';
import * as layout from './layout.ts';
import { shouldResizeRenderer } from './layout.ts';

describe('layout module after the dim and avoid removal', () => {
  it('keeps only the resize-storm guard', () => {
    expect(Object.keys(layout)).toEqual(['shouldResizeRenderer']);
    for (const removed of ['scatterLayout', 'remapScatterU', 'dimRectNdc', 'dimAt']) {
      expect(removed in layout, removed).toBe(false);
    }
  });
});

describe('shouldResizeRenderer', () => {
  it('accepts the first size', () => {
    expect(shouldResizeRenderer(null, { w: 390, h: 844 })).toBe(true);
  });

  it('rejects a height-only change below 15 % (mobile URL bar)', () => {
    expect(shouldResizeRenderer({ w: 390, h: 844 }, { w: 390, h: 760 })).toBe(false);
    expect(shouldResizeRenderer({ w: 390, h: 760 }, { w: 390, h: 844 })).toBe(false);
  });

  it('accepts a height change above 15 % and any width change', () => {
    expect(shouldResizeRenderer({ w: 1440, h: 900 }, { w: 1440, h: 700 })).toBe(true);
    expect(shouldResizeRenderer({ w: 1440, h: 900 }, { w: 1439, h: 900 })).toBe(true);
    expect(shouldResizeRenderer({ w: 390, h: 844 }, { w: 844, h: 390 })).toBe(true);
  });

  it('rejects an identical size', () => {
    expect(shouldResizeRenderer({ w: 800, h: 600 }, { w: 800, h: 600 })).toBe(false);
  });
});
