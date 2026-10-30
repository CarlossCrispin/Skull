import { describe, expect, it } from 'vitest';
import { barcodeBars } from './barcode.ts';

describe('barcodeBars', () => {
  it('is deterministic per seed', () => {
    expect(barcodeBars('MICTLAN')).toEqual(barcodeBars('MICTLAN'));
    expect(barcodeBars('MICTLAN')).not.toEqual(barcodeBars('OFRENDA'));
  });

  it('returns the requested number of bars, 1 to 4 units wide', () => {
    const bars = barcodeBars('seed', 30);
    expect(bars.bars).toHaveLength(30);
    for (const bar of bars.bars) {
      expect(bar.width).toBeGreaterThanOrEqual(1);
      expect(bar.width).toBeLessThanOrEqual(4);
    }
  });

  it('never overlaps bars and keeps them inside the total width', () => {
    const { bars, width } = barcodeBars('overlap');
    let end = 0;
    for (const bar of bars) {
      expect(bar.x).toBeGreaterThan(end - 1);
      expect(bar.x).toBeGreaterThanOrEqual(end);
      end = bar.x + bar.width;
    }
    expect(end).toBeLessThanOrEqual(width);
  });
});
