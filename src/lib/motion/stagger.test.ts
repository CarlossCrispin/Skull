import { describe, expect, it } from 'vitest';
import { planReveal } from './stagger.ts';

// Positions in document order: 0 title, 1-4 stanzas, 5 signature.
const ALL = [0, 1, 2, 3, 4, 5];
const set = (...positions: number[]) => new Set(positions);

describe('planReveal', () => {
  it('returns nothing when no pending item intersects', () => {
    expect(planReveal(ALL, set())).toEqual([]);
    expect(planReveal([2, 3], set(5))).toEqual([]);
  });

  it('reveals a lone title with 0 ms', () => {
    expect(planReveal(ALL, set(0))).toEqual([{ index: 0, delayMs: 0 }]);
  });

  it('reveals a lone stanza (title already revealed) with 120 ms', () => {
    expect(planReveal([1, 2, 3, 4, 5], set(1))).toEqual([{ index: 1, delayMs: 120 }]);
    expect(planReveal([4, 5], set(4))).toEqual([{ index: 4, delayMs: 120 }]);
  });

  it('reveals a lone signature with 120 ms', () => {
    expect(planReveal([5], set(5))).toEqual([{ index: 5, delayMs: 120 }]);
  });

  it('reveals every earlier pending item together with an intersecting one, in order', () => {
    expect(planReveal(ALL, set(2))).toEqual([
      { index: 0, delayMs: 0 },
      { index: 1, delayMs: 120 },
      { index: 2, delayMs: 240 },
    ]);
    expect(planReveal([3, 4, 5], set(4))).toEqual([
      { index: 3, delayMs: 120 },
      { index: 4, delayMs: 240 },
    ]);
  });

  it('puts the signature last at max(120, highest delay + 120) when everything intersects', () => {
    const plan = planReveal(ALL, set(0, 1, 2, 3, 4, 5));
    expect(plan.map((step) => step.index)).toEqual(ALL);
    expect(plan.map((step) => step.delayMs)).toEqual([0, 120, 240, 360, 480, 600]);
  });

  it('keeps pending items after the last intersecting one out of the batch', () => {
    expect(planReveal(ALL, set(1)).map((step) => step.index)).toEqual([0, 1]);
  });

  it('ignores intersecting positions that are not pending', () => {
    expect(planReveal([2, 3], set(0, 3))).toEqual([
      { index: 2, delayMs: 120 },
      { index: 3, delayMs: 240 },
    ]);
  });
});
