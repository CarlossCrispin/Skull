import { describe, expect, it } from 'vitest';
import * as constants from './constants.ts';

describe('scene constants', () => {
  it('frames the skull at 0.84 of the short side, leaving breathing room above and below', () => {
    expect(constants.STAGE_SCALE).toBe(0.84);
  });

  it('keeps the mute amounts and the 5 % on-screen share', () => {
    expect(constants.SCATTER_ONSCREEN_SHARE).toBe(0.05);
    expect(constants.SCATTER_MUTE_DESATURATE).toBe(0.7);
    expect(constants.SCATTER_MUTE_LIGHTEN).toBe(0.55);
  });

  it('no longer exports the column avoidance and dim tunables', () => {
    for (const removed of [
      'MIN_SIDE_MARGIN_PX',
      'COLUMN_CLEARANCE_PX',
      'DIM_STRENGTH',
      'DIM_BAND_FRACTION',
      'DIM_FEATHER',
      'SCATTER_EDGE_BAND',
    ]) {
      expect(removed in constants, removed).toBe(false);
    }
  });
});
