import { describe, expect, it } from 'vitest';
import { mulberry32 } from '../../scene/voxel/prng.js';
import {
  assemblyFactor,
  assemblyTarget,
  initialAssembly,
  latticeOpacity,
  needsFrame,
  stepAssembly,
} from './assembly.js';
import { easeOutCubic } from './easing.js';
import { OPENING_DONE } from './opening.js';
import { PROGRESS_SNAP } from './constants.js';

describe('assemblyFactor', () => {
  it('is 0 at p = 0 for every delay', () => {
    for (const delay of [0, 0.25, 0.5, 0.75, 1]) {
      expect(assemblyFactor(0, delay, 0.6)).toBe(0);
    }
  });

  it('is exactly 1 at p = 1 for 1000 generated delays', () => {
    const rand = mulberry32(7);
    for (let i = 0; i < 1000; i += 1) {
      expect(assemblyFactor(1, rand(), 0.6)).toBe(1);
    }
    expect(assemblyFactor(1, 1, 0.6)).toBe(1);
  });

  it('is monotonic non-decreasing in p', () => {
    for (const delay of [0, 0.3, 0.7, 1]) {
      let prev = -1;
      for (let step = 0; step <= 100; step += 1) {
        const e = assemblyFactor(step / 100, delay, 0.6);
        expect(e).toBeGreaterThanOrEqual(prev);
        prev = e;
      }
    }
  });

  it('never lets a later delay run ahead of an earlier delay at the same p', () => {
    for (let step = 0; step <= 100; step += 1) {
      const p = step / 100;
      expect(assemblyFactor(p, 0.8, 0.6)).toBeLessThanOrEqual(assemblyFactor(p, 0.2, 0.6));
    }
  });

  it('starts moving the last cube (delay 1) at p = 0.6 and not before', () => {
    expect(assemblyFactor(0.6, 1, 0.6)).toBe(0);
    expect(assemblyFactor(0.59, 1, 0.6)).toBe(0);
    expect(assemblyFactor(0.7, 1, 0.6)).toBeGreaterThan(0);
  });

  it('uses the easeInOutCubic midpoint of the window', () => {
    // delay 0: window is [0, 0.4]; p = 0.2 is t = 0.5 -> ease 0.5
    expect(assemblyFactor(0.2, 0, 0.6)).toBeCloseTo(0.5, 12);
  });
});

describe('assemblyTarget', () => {
  const metrics = { start: 0, end: 2000, maxScroll: 4000 };

  it('maps the spec table (-20, 0, 1000, 2000, 3000)', () => {
    const table = [
      [-20, 0],
      [0, 0],
      [1000, 0.5],
      [2000, 1],
      [3000, 1],
    ];
    for (const [scrollY, expected] of table) {
      expect(assemblyTarget(scrollY, metrics)).toBe(expected);
    }
  });

  it('is 1 at the bottom of the page even when end lies beyond maxScroll', () => {
    const short = { start: 0, end: 5000, maxScroll: 3000 };
    expect(assemblyTarget(2999, short)).toBe(1);
    expect(assemblyTarget(3000, short)).toBe(1);
    expect(assemblyTarget(2000, short)).toBeCloseTo(0.4, 12);
  });

  it('guards a zero or negative range without NaN', () => {
    const flat = { start: 100, end: 100, maxScroll: 500 };
    expect(assemblyTarget(50, flat)).toBe(0);
    expect(assemblyTarget(300, flat)).toBe(0);
    expect(assemblyTarget(500, flat)).toBe(1);
    expect(Number.isNaN(assemblyTarget(100, { start: 100, end: 50, maxScroll: 500 }))).toBe(false);
  });

  it('is a pure function of scrollY (direction and history independent)', () => {
    const a = assemblyTarget(600, metrics);
    assemblyTarget(1900, metrics);
    assemblyTarget(0, metrics);
    expect(assemblyTarget(600, metrics)).toBe(a);
    expect(a).toBeCloseTo(0.3, 12);
  });
});

const DT = 1 / 60;

/** Steps until the state stops moving toward `target` bounded. */
function settle(state, target) {
  let next = state;
  for (let i = 0; i < 2000 && next.progress !== target; i += 1) {
    next = stepAssembly(next, target, DT);
  }
  return next;
}

describe('stepAssembly', () => {
  it('starts scattered, uninitialized and with a stopped clock', () => {
    expect(initialAssembly()).toEqual({
      progress: 0,
      phase: 'scattered',
      rotationT: 0,
      initialized: false,
    });
  });

  it('snaps progress to the target on the first frame (restored mid-page reload)', () => {
    const mid = stepAssembly(initialAssembly(), 0.5, DT);
    expect(mid.progress).toBe(0.5);
    expect(mid.initialized).toBe(true);
    expect(mid.phase).toBe('assembling');
    const full = stepAssembly(initialAssembly(), 1, DT);
    expect(full.progress).toBe(1);
    expect(full.phase).toBe('assembled');
  });

  it('smooths later frames and snaps inside PROGRESS_SNAP of the target', () => {
    const first = stepAssembly(initialAssembly(), 0, DT);
    const next = stepAssembly(first, 1, DT);
    expect(next.progress).toBeGreaterThan(0);
    expect(next.progress).toBeLessThan(1);
    const near = stepAssembly({ ...next, progress: 0.9995 }, 1, DT);
    expect(near.progress).toBe(1);
    const far = stepAssembly({ ...next, progress: 0.99 }, 1, DT);
    expect(far.progress).toBeLessThan(1);
  });

  it('reports the scattered, assembling and assembled phases', () => {
    const base = stepAssembly(initialAssembly(), 0, DT);
    expect(base.phase).toBe('scattered');
    expect(stepAssembly(base, 0.4, DT).phase).toBe('assembling');
    expect(settle(base, 1).phase).toBe('assembled');
  });

  it('keeps the assembled phase through the 0.995 hysteresis and leaves below it', () => {
    const done = stepAssembly(initialAssembly(), 1, DT);
    const held = stepAssembly({ ...done, progress: 0.996 }, 0.996, DT);
    expect(held.phase).toBe('assembled');
    const left = stepAssembly({ ...done, progress: 0.99 }, 0.99, DT);
    expect(left.phase).toBe('assembling');
    // Not previously assembled: 0.996 is only assembling.
    const fresh = stepAssembly(
      { progress: 0.5, phase: 'assembling', rotationT: 0, initialized: true },
      0.996,
      0,
    );
    expect(fresh.phase).toBe('assembling');
  });

  it('starts the rotation clock at 0 on first assembly and advances it only while assembled', () => {
    let state = stepAssembly(initialAssembly(), 0, DT);
    state = stepAssembly(state, 0.5, DT);
    expect(state.rotationT).toBe(0);
    const done = stepAssembly(initialAssembly(), 1, DT);
    expect(done.rotationT).toBe(0);
    const running = stepAssembly(done, 1, 0.5);
    expect(running.rotationT).toBe(0.5);
    expect(stepAssembly(running, 1, 0.25).rotationT).toBe(0.75);
  });

  it('freezes the clock at its value on scroll-up and resumes from it on reassembly', () => {
    const assembled = { progress: 1, phase: 'assembled', rotationT: 4.2, initialized: true };
    let state = assembled;
    for (let i = 0; i < 30; i += 1) {
      state = stepAssembly(state, 0.2, DT);
    }
    expect(state.phase).toBe('assembling');
    expect(state.rotationT).toBe(4.2);
    state = settle(state, 0);
    expect(state.phase).toBe('scattered');
    expect(state.rotationT).toBe(4.2);
    state = settle(state, 1);
    expect(state.phase).toBe('assembled');
    expect(state.rotationT).toBe(4.2);
    expect(stepAssembly(state, 1, 0.5).rotationT).toBeCloseTo(4.7, 12);
  });

  it('round-trips settled progress at scrollY 300 -> max -> 300 within 1e-4', () => {
    const metrics = { start: 0, end: 2000, maxScroll: 2400 };
    let state = stepAssembly(initialAssembly(), assemblyTarget(300, metrics), DT);
    state = settle(state, assemblyTarget(300, metrics));
    const before = state.progress;
    state = settle(state, assemblyTarget(2400, metrics));
    expect(state.progress).toBe(1);
    state = settle(state, assemblyTarget(300, metrics));
    expect(Math.abs(state.progress - before)).toBeLessThan(1e-4);
    expect(before).toBeCloseTo(0.15, 12);
  });

  it('moves monotonically and by at most 12 % of the range per frame on a fast scroll', () => {
    let state = stepAssembly(initialAssembly(), 0, DT);
    for (let i = 0; i < 200 && state.progress < 1; i += 1) {
      const next = stepAssembly(state, 1, DT);
      expect(next.progress).toBeGreaterThanOrEqual(state.progress);
      expect(next.progress - state.progress).toBeLessThanOrEqual(0.12 + 1e-9);
      state = next;
    }
    expect(state.progress).toBe(1);
  });
});

describe('needsFrame', () => {
  const at = (progress, phase) => ({
    progress,
    phase,
    rotationT: 0,
    initialized: true,
  });

  it('is false when scattered or assembling with progress equal to the target', () => {
    expect(needsFrame(at(0, 'scattered'), 0)).toBe(false);
    expect(needsFrame(at(0.4, 'assembling'), 0.4)).toBe(false);
  });

  it('is true while progress still converges on the target', () => {
    expect(needsFrame(at(0.3, 'assembling'), 0.4)).toBe(true);
    expect(needsFrame(at(0, 'scattered'), 0.2)).toBe(true);
  });

  it('is true while assembled, even with progress at the target (ambient rotation)', () => {
    expect(needsFrame(at(1, 'assembled'), 1)).toBe(true);
  });
});

describe('latticeOpacity', () => {
  it('is 0 up to progress 0.8 and exactly 1 at progress 1', () => {
    expect(latticeOpacity(0)).toBe(0);
    expect(latticeOpacity(0.8)).toBe(0);
    expect(latticeOpacity(1)).toBe(1);
  });

  it('is non-decreasing and strictly inside (0, 1) between 0.8 and 1', () => {
    let prev = 0;
    for (let step = 0; step <= 100; step += 1) {
      const o = latticeOpacity(step / 100);
      expect(o).toBeGreaterThanOrEqual(prev);
      prev = o;
    }
    expect(latticeOpacity(0.9)).toBeCloseTo(0.5, 12);
  });
});

describe('opening-aware assembly', () => {
  const HOLD = { phase: 'hold', zoom: 1, explode: 0 };
  const WAITING = { phase: 'waiting', zoom: 0, explode: 0 };
  const zooming = (zoom) => ({ phase: 'zoom', zoom, explode: 0 });
  const exploding = (explode) => ({ phase: 'exploding', zoom: 1, explode });

  it('holds progress at 1 and the opening phase in waiting, zoom and hold, with the clock at 0', () => {
    for (const opening of [WAITING, zooming(0.4), HOLD]) {
      let state = initialAssembly();
      for (let i = 0; i < 30; i += 1) {
        state = stepAssembly(state, 0, DT, opening);
      }
      expect(state.progress).toBe(1);
      expect(state.phase).toBe('opening');
      expect(state.rotationT).toBe(0);
    }
  });

  it('needs no frame in waiting or hold and a frame in zoom and exploding', () => {
    const at = stepAssembly(initialAssembly(), 0, DT, HOLD);
    expect(needsFrame(at, 0, WAITING)).toBe(false);
    expect(needsFrame(at, 0, HOLD)).toBe(false);
    expect(needsFrame(at, 0, zooming(0.3))).toBe(true);
    expect(needsFrame(at, 0, exploding(0.3))).toBe(true);
  });

  it('keeps asking for frames in done while a started zoom is below 1, and stops at 1', () => {
    const settled = { progress: 0, phase: 'scattered', rotationT: 0, initialized: true };
    expect(needsFrame(settled, 0, { phase: 'done', zoom: 0.6, explode: 1 })).toBe(true);
    expect(needsFrame(settled, 0, { phase: 'done', zoom: 1, explode: 1 })).toBe(false);
    expect(needsFrame(settled, 0)).toBe(false);
  });

  it('holds progress at 1 in the opening phase whatever the target', () => {
    const state = stepAssembly(initialAssembly(), 0, DT, HOLD);
    expect(state.progress).toBe(1);
    expect(state.phase).toBe('opening');
    expect(stepAssembly(state, 0.4, DT, HOLD).progress).toBe(1);
  });

  it('lerps from 1 to the target by the explode amount', () => {
    const state = stepAssembly(initialAssembly(), 0, DT, exploding(easeOutCubic(0.5)));
    expect(state.progress).toBeCloseTo(1 - 0.875, 12);
    expect(state.phase).toBe('opening');
    const toward = stepAssembly(initialAssembly(), 0.4, DT, exploding(0.5));
    expect(toward.progress).toBeCloseTo(0.7, 12);
  });

  it('ends the explosion exactly at the live target, including a target of 1 (no step)', () => {
    expect(stepAssembly(initialAssembly(), 0, DT, exploding(1)).progress).toBe(0);
    expect(stepAssembly(initialAssembly(), 1, DT, exploding(0.3)).progress).toBe(1);
  });

  it('never advances the rotation clock through the opening', () => {
    let state = initialAssembly();
    for (let i = 0; i < 60; i += 1) {
      state = stepAssembly(state, 0, DT, HOLD);
    }
    expect(state.rotationT).toBe(0);
    for (let i = 0; i <= 10; i += 1) {
      state = stepAssembly(state, 1, DT, exploding(i / 10));
      expect(state.rotationT).toBe(0);
    }
  });

  it('hands off to smoothing continuously and starts the clock at 0 on the first assembly', () => {
    const end = stepAssembly(initialAssembly(), 0, DT, exploding(1));
    const first = stepAssembly(end, 0.5, DT, OPENING_DONE);
    expect(first.phase).toBe('assembling');
    expect(Math.abs(first.progress - end.progress)).toBeLessThanOrEqual(0.12 * 0.5 + PROGRESS_SNAP);
    const after = stepAssembly(settle(first, 1), 1, 0.5);
    expect(after.phase).toBe('assembled');
    expect(settle(first, 1).rotationT).toBe(0);
    expect(after.rotationT).toBe(0.5);
  });

  it('does not count a previous opening phase as assembled when the opening is done', () => {
    const held = stepAssembly(initialAssembly(), 1, DT, HOLD);
    expect(held.phase).toBe('opening');
    const done = stepAssembly(held, 1, DT, OPENING_DONE);
    expect(done.progress).toBe(1);
    expect(done.phase).toBe('assembled');
    expect(done.rotationT).toBe(0);
    const hysteresis = stepAssembly({ ...held, progress: 0.996 }, 0.996, DT, OPENING_DONE);
    expect(hysteresis.phase).toBe('assembling');
  });

  it('needs frames while exploding, not in the hold, and defaults to a finished opening', () => {
    const at = (progress, phase) => ({
      progress,
      phase,
      rotationT: 0,
      initialized: true,
    });
    expect(needsFrame(at(1, 'opening'), 0, HOLD)).toBe(false);
    expect(needsFrame(at(0.6, 'opening'), 0, exploding(0.4))).toBe(true);
    expect(needsFrame(at(1, 'assembled'), 1, OPENING_DONE)).toBe(true);
    expect(needsFrame(at(0.3, 'assembling'), 0.4, OPENING_DONE)).toBe(true);
    expect(needsFrame(at(0.4, 'assembling'), 0.4, OPENING_DONE)).toBe(false);
    expect(needsFrame(at(1, 'opening'), 0)).toBe(true);
  });
});
