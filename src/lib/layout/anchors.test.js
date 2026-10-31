import { describe, expect, it } from 'vitest';
import * as anchors from './anchors.js';
import { ASSEMBLY_RANGE_ATTR, GLASS_PANEL_ATTR } from './anchors.js';

describe('layout anchors', () => {
  it('names the data attributes the scene driver and the page look up', () => {
    expect(ASSEMBLY_RANGE_ATTR).toBe('data-assembly-range');
    expect(GLASS_PANEL_ATTR).toBe('data-glass-panel');
  });

  it('no longer exports the text column or title anchors (the glass panel replaced them)', () => {
    expect(Object.keys(anchors).sort()).toEqual(['ASSEMBLY_RANGE_ATTR', 'GLASS_PANEL_ATTR']);
  });
});
