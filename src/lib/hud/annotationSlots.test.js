import { describe, expect, it } from 'vitest';
import {
  ANNOTATION_CANDIDATES,
  CARD_HEIGHT_PX,
  CARD_WIDTH_PX,
  placeAnnotations,
  rollsRandom,
} from './annotationSlots.js';

const CARD = { width: CARD_WIDTH_PX, height: CARD_HEIGHT_PX };
const DESKTOP = { width: 1280, height: 713 };
// The 1280x713 H1 band measured in the browser: full gutter width, top 320, bottom 448.
const H1_BAND = { left: 64, top: 320, right: 1216, bottom: 448 };
const MARGIN = 12;

const intersects = (a, b, gap = 0) =>
  a.left < b.right + gap && a.right + gap > b.left && a.top < b.bottom + gap && a.bottom + gap > b.top;
const rectOf = (slot) => ({ left: slot.left, top: slot.top, right: slot.left + CARD.width, bottom: slot.top + CARD.height });

/** A small deterministic generator (Park-Miller) for property-style loops. */
function seeded(seed) {
  let state = seed + 1;
  return () => {
    state = (state * 16807) % 2147483647;
    return state / 2147483647;
  };
}

function place(overrides = {}) {
  return placeAnnotations({
    candidates: ANNOTATION_CANDIDATES,
    cardSize: CARD,
    obstacles: [],
    viewport: DESKTOP,
    random: seeded(1),
    count: 4,
    ...overrides,
  });
}

describe('ANNOTATION_CANDIDATES', () => {
  it('lists 16 uniquely named candidates in 8 regions over the skull area', () => {
    expect(ANNOTATION_CANDIDATES).toHaveLength(16);
    expect(new Set(ANNOTATION_CANDIDATES.map((c) => c.id)).size).toBe(16);
    expect(new Set(ANNOTATION_CANDIDATES.map((c) => c.region)).size).toBe(8);
    for (const c of ANNOTATION_CANDIDATES) {
      expect(c.x).toBeGreaterThanOrEqual(25);
      expect(c.x).toBeLessThanOrEqual(75);
      expect(c.y).toBeGreaterThanOrEqual(18);
      expect(c.y).toBeLessThanOrEqual(85);
    }
  });
});

describe('placeAnnotations', () => {
  it('places the requested number of cards when the frame is empty', () => {
    expect(place()).toHaveLength(4);
  });

  it('never intersects an obstacle, margin included, including an H1-like wide band', () => {
    for (let seed = 0; seed < 60; seed += 1) {
      const slots = place({ obstacles: [H1_BAND], random: seeded(seed) });
      for (const slot of slots) expect(intersects(rectOf(slot), H1_BAND, MARGIN), `seed ${seed} ${slot.id}`).toBe(false);
    }
  });

  it('never lets two cards intersect', () => {
    for (let seed = 0; seed < 60; seed += 1) {
      const slots = place({ random: seeded(seed) }).map(rectOf);
      for (let i = 0; i < slots.length; i += 1) {
        for (let j = i + 1; j < slots.length; j += 1) expect(intersects(slots[i], slots[j])).toBe(false);
      }
    }
  });

  it('spreads the cards across different regions and both sides', () => {
    for (let seed = 0; seed < 60; seed += 1) {
      const slots = place({ random: seeded(seed) });
      expect(new Set(slots.map((s) => s.region)).size).toBe(slots.length);
      expect(slots.filter((s) => s.side === 'left').length).toBeLessThanOrEqual(2);
      expect(slots.filter((s) => s.side === 'right').length).toBeLessThanOrEqual(2);
    }
  });

  it('keeps every card inside the viewport', () => {
    for (let seed = 0; seed < 30; seed += 1) {
      for (const slot of place({ random: seeded(seed), viewport: { width: 768, height: 600 } })) {
        const r = rectOf(slot);
        expect(r.left).toBeGreaterThanOrEqual(0);
        expect(r.top).toBeGreaterThanOrEqual(0);
        expect(r.right).toBeLessThanOrEqual(768);
        expect(r.bottom).toBeLessThanOrEqual(600);
      }
    }
  });

  it('returns fewer cards when the obstacles leave too little room, and none when nothing fits', () => {
    const wall = { left: 0, top: 0, right: 1280, bottom: 713 };
    expect(place({ obstacles: [wall] })).toEqual([]);
    const leftHalf = { left: 0, top: 0, right: 640, bottom: 713 };
    const slots = place({ obstacles: [leftHalf] });
    expect(slots.length).toBeGreaterThan(0);
    expect(slots.length).toBeLessThan(4);
    for (const slot of slots) expect(slot.side).toBe('right');
  });

  it('ignores obstacles without area (elements that are not laid out)', () => {
    const empty = { left: 0, top: 0, right: 0, bottom: 0 };
    expect(place({ obstacles: [empty] })).toHaveLength(4);
  });

  it('is deterministic for an injected random and follows it', () => {
    const a = place({ random: seeded(7) });
    const b = place({ random: seeded(7) });
    expect(a).toEqual(b);
    const others = new Set(Array.from({ length: 20 }, (_, seed) => place({ random: seeded(seed) }).map((s) => s.id).join()));
    expect(others.size).toBeGreaterThan(1);
  });

  it('reports px positions and the side facing away from the skull centre', () => {
    for (const slot of place()) {
      expect(Number.isFinite(slot.left)).toBe(true);
      expect(Number.isFinite(slot.top)).toBe(true);
      const centre = slot.left + CARD.width / 2;
      expect(slot.side).toBe(centre < DESKTOP.width / 2 ? 'left' : 'right');
    }
  });
});

describe('rollsRandom', () => {
  it('replays the same sequence from a fresh reader each time, then repeats the last roll', () => {
    const rolls = [0.1, 0.2];
    const first = rollsRandom(rolls);
    expect([first(), first(), first()]).toEqual([0.1, 0.2, 0.2]);
    const second = rollsRandom(rolls);
    expect(second()).toBe(0.1);
  });
});
