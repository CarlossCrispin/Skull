import { describe, expect, it } from 'vitest';
import { ANNOTATION_SLOTS, CARD_WIDTH_PX, pickSlots, SLOT_COLUMN_EDGE_PCT, SLOT_ROW_PITCH_PCT } from './annotationSlots.js';

/** A random() that replays the given values, then repeats the last one. */
function sequence(...values) {
  let index = 0;
  return () => values[Math.min(index++, values.length - 1)];
}

describe('ANNOTATION_SLOTS', () => {
  it('has 8 uniquely named slots over the skull area, two columns by four rows', () => {
    expect(ANNOTATION_SLOTS).toHaveLength(8);
    expect(new Set(ANNOTATION_SLOTS.map((slot) => slot.id)).size).toBe(8);
    expect(ANNOTATION_SLOTS.filter((slot) => slot.side === 'left')).toHaveLength(4);
    expect(ANNOTATION_SLOTS.filter((slot) => slot.side === 'right')).toHaveLength(4);
    for (const slot of ANNOTATION_SLOTS) {
      expect(slot.top).toBeGreaterThanOrEqual(30);
      expect(slot.top).toBeLessThanOrEqual(70);
    }
  });

  it('keeps any two distinct slots collision-free at the md breakpoint (768 px)', () => {
    const viewport = 768;
    const widthPct = (CARD_WIDTH_PX / viewport) * 100;
    for (const a of ANNOTATION_SLOTS) {
      for (const b of ANNOTATION_SLOTS) {
        if (a.id >= b.id) continue;
        const sameRow = Math.abs(a.top - b.top) < SLOT_ROW_PITCH_PCT;
        if (!sameRow) continue;
        // Same row: they must sit in different columns whose horizontal spans do not touch.
        expect(a.side).not.toBe(b.side);
        expect(SLOT_COLUMN_EDGE_PCT + widthPct).toBeLessThan(100 - SLOT_COLUMN_EDGE_PCT - widthPct);
      }
    }
  });
});

describe('pickSlots', () => {
  it('returns 4 distinct slots by default', () => {
    const picked = pickSlots(Math.random);
    expect(picked).toHaveLength(4);
    expect(new Set(picked.map((slot) => slot.id)).size).toBe(4);
  });

  it('is deterministic for an injected random', () => {
    const first = pickSlots(sequence(0, 0, 0, 0));
    const second = pickSlots(sequence(0, 0, 0, 0));
    expect(first).toEqual(second);
    expect(first.map((slot) => slot.id)).toEqual(ANNOTATION_SLOTS.slice(0, 4).map((slot) => slot.id));
  });

  it('follows the random values (a partial Fisher-Yates)', () => {
    const picked = pickSlots(sequence(0.999, 0.999, 0.999, 0.999));
    expect(picked.map((slot) => slot.id)).toEqual(
      [ANNOTATION_SLOTS[7], ANNOTATION_SLOTS[0], ANNOTATION_SLOTS[1], ANNOTATION_SLOTS[2]].map((slot) => slot.id),
    );
  });

  it('never returns the same slot twice for any random stream', () => {
    for (let seed = 0; seed < 50; seed += 1) {
      let state = seed + 1;
      const random = () => {
        state = (state * 16807) % 2147483647;
        return state / 2147483647;
      };
      const ids = pickSlots(random).map((slot) => slot.id);
      expect(new Set(ids).size).toBe(4);
    }
  });

  it('does not mutate the slot table', () => {
    const before = ANNOTATION_SLOTS.map((slot) => slot.id);
    pickSlots(sequence(0.9, 0.1, 0.5, 0.3));
    expect(ANNOTATION_SLOTS.map((slot) => slot.id)).toEqual(before);
  });
});
