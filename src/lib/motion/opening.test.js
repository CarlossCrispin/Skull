import { describe, expect, it } from 'vitest';
import {
  CANVAS_FADE_MS,
  OPENING_EXPLODE_S,
  OPENING_HOLD_S,
  OPENING_MAX_WAIT_S,
  OPENING_ZOOM_S,
  OPENING_ZOOM_START_Z,
} from './constants.js';
import { easeOutCubic } from './easing.js';
import {
  OPENING_DONE,
  openingAdvance,
  openingDeadline,
  openingInitial,
  openingSample,
  openingSceneFailed,
  openingSceneReady,
  openingScroll,
} from './opening.js';

const ZOOM_MS = OPENING_ZOOM_S * 1000;
const HOLD_MS = OPENING_HOLD_S * 1000;
const EXPLODE_MS = OPENING_EXPLODE_S * 1000;
const MAX_WAIT_MS = OPENING_MAX_WAIT_S * 1000;
const T0 = 10_000;
const READY = 300;

describe('opening constants', () => {
  it('uses the zoom, hold, explode and wait timings', () => {
    expect(OPENING_ZOOM_S).toBe(1.6);
    expect(OPENING_HOLD_S).toBe(0.8);
    expect(OPENING_EXPLODE_S).toBe(1.2);
    expect(OPENING_MAX_WAIT_S).toBe(4);
    expect(OPENING_ZOOM_START_Z).toBe(150);
    expect(CANVAS_FADE_MS).toBe(500);
  });
});

describe('openingInitial and OPENING_DONE', () => {
  it('starts done when motion is not animated and waiting otherwise', () => {
    expect(openingInitial(T0, false).phase).toBe('done');
    const waiting = openingInitial(T0, true);
    expect(waiting).toEqual({
      phase: 'waiting',
      mountMs: T0,
      zoomStartMs: null,
      explodeStartMs: null,
      skipped: false,
    });
  });

  it('exposes the finished sample, without a dim field', () => {
    expect(OPENING_DONE).toEqual({ phase: 'done', zoom: 1, explode: 1 });
    expect(openingSample(openingInitial(T0, false), T0)).toEqual(OPENING_DONE);
  });
});

describe('openingSceneReady', () => {
  it('moves waiting to zoom and records the zoom start only once', () => {
    const first = openingSceneReady(openingInitial(T0, true), T0 + READY);
    expect(first.phase).toBe('zoom');
    expect(first.zoomStartMs).toBe(T0 + READY);
    expect(openingSceneReady(first, T0 + 900)).toEqual(first);
  });

  it('is ignored once the maximum wait has passed: the opening stays skipped', () => {
    const late = openingSceneReady(openingInitial(T0, true), T0 + MAX_WAIT_MS + 100);
    expect(late.phase).toBe('done');
    expect(late.skipped).toBe(true);
    expect(late.zoomStartMs).toBeNull();
  });

  it('a scene ready just before the deadline still zooms', () => {
    const lateReady = openingSceneReady(openingInitial(T0, true), T0 + MAX_WAIT_MS - 100);
    expect(lateReady.phase).toBe('zoom');
  });
});

describe('zoom, hold, explode timeline (ready at 0.3 s)', () => {
  const state = openingSceneReady(openingInitial(T0, true), T0 + READY);
  const at = (ms) => openingSample(state, T0 + ms);

  it('samples the zoom ease at 1.1 s with no explosion', () => {
    const s = at(1100);
    expect(s.phase).toBe('zoom');
    expect(s.zoom).toBeCloseTo(easeOutCubic(0.5), 12);
    expect(s.explode).toBe(0);
  });

  it('is zoom 0 right at the ready instant', () => {
    expect(at(READY)).toEqual({ phase: 'zoom', zoom: 0, explode: 0 });
  });

  it('holds at zoom 1 from +1.6 s until +2.4 s', () => {
    expect(openingAdvance(state, T0 + READY + ZOOM_MS - 1).phase).toBe('zoom');
    expect(openingAdvance(state, T0 + READY + ZOOM_MS).phase).toBe('hold');
    expect(at(2300)).toEqual({ phase: 'hold', zoom: 1, explode: 0 });
    expect(openingAdvance(state, T0 + READY + ZOOM_MS + HOLD_MS - 1).phase).toBe('hold');
  });

  it('starts the explosion at exactly zoom end + hold, even when sampled later', () => {
    const exploding = openingAdvance(state, T0 + READY + ZOOM_MS + HOLD_MS + 600);
    expect(exploding.phase).toBe('exploding');
    expect(exploding.explodeStartMs).toBe(T0 + READY + ZOOM_MS + HOLD_MS);
  });

  it('eases the explosion out: half way at 3.3 s', () => {
    const s = at(3300);
    expect(s.phase).toBe('exploding');
    expect(s.zoom).toBe(1);
    expect(s.explode).toBeCloseTo(easeOutCubic(0.5), 12);
  });

  it('is done at 3.9 s and stays done', () => {
    expect(at(3900)).toEqual(OPENING_DONE);
    expect(at(60_000)).toEqual(OPENING_DONE);
    expect(openingAdvance(state, T0 + READY + ZOOM_MS + HOLD_MS + EXPLODE_MS - 1).phase).toBe(
      'exploding',
    );
  });
});

describe('scroll', () => {
  const ready = openingSceneReady(openingInitial(T0, true), T0 + READY);

  it('in waiting skips straight to done', () => {
    const scrolled = openingScroll(openingInitial(T0, true), T0 + 200);
    expect(scrolled.phase).toBe('done');
    expect(scrolled.skipped).toBe(true);
    expect(scrolled.explodeStartMs).toBeNull();
    expect(openingSample(scrolled, T0 + 200)).toEqual(OPENING_DONE);
  });

  it('in zoom starts the explosion now while the zoom keeps its time curve', () => {
    const scrolled = openingScroll(ready, T0 + 1100);
    expect(scrolled.phase).toBe('exploding');
    expect(scrolled.explodeStartMs).toBe(T0 + 1100);
    const sample = openingSample(scrolled, T0 + 1100 + 300);
    expect(sample.phase).toBe('exploding');
    expect(sample.zoom).toBeCloseTo(easeOutCubic((1100 + 300 - READY) / ZOOM_MS), 12);
    expect(sample.explode).toBeCloseTo(easeOutCubic(300 / EXPLODE_MS), 12);
    expect(openingAdvance(scrolled, T0 + 1100 + EXPLODE_MS).phase).toBe('done');
    expect(openingAdvance(scrolled, T0 + 1100 + EXPLODE_MS - 1).phase).toBe('exploding');
  });

  it('in hold starts the explosion now', () => {
    const scrolled = openingScroll(ready, T0 + 2300);
    expect(scrolled.phase).toBe('exploding');
    expect(scrolled.explodeStartMs).toBe(T0 + 2300);
    expect(openingSample(scrolled, T0 + 2300).zoom).toBe(1);
  });

  it('keeps the zoom following its curve in done after an early scroll', () => {
    const scrolled = openingScroll(ready, T0 + 400);
    const done = openingSample(scrolled, T0 + 400 + EXPLODE_MS + 50);
    expect(done.phase).toBe('done');
    expect(done.explode).toBe(1);
    expect(done.zoom).toBeCloseTo(easeOutCubic((400 + EXPLODE_MS + 50 - READY) / ZOOM_MS), 12);
    expect(done.zoom).toBeLessThan(1);
    expect(openingSample(scrolled, T0 + 60_000)).toEqual(OPENING_DONE);
  });

  it('leaves exploding and done states unchanged', () => {
    const exploding = openingScroll(ready, T0 + 800);
    expect(openingScroll(exploding, T0 + 900)).toEqual(exploding);
    expect(openingSceneReady(exploding, T0 + 900)).toEqual(exploding);
    const done = openingInitial(T0, false);
    expect(openingScroll(done, T0 + 900)).toEqual(done);
    expect(openingSceneReady(done, T0 + 900)).toEqual(done);
    expect(openingSceneFailed(done)).toEqual(done);
  });
});

describe('maximum wait', () => {
  it('skips once OPENING_MAX_WAIT_S has elapsed after mount while waiting', () => {
    const waiting = openingInitial(T0, true);
    expect(openingAdvance(waiting, T0 + MAX_WAIT_MS - 1).phase).toBe('waiting');
    const skipped = openingAdvance(waiting, T0 + MAX_WAIT_MS);
    expect(skipped.phase).toBe('done');
    expect(skipped.skipped).toBe(true);
    expect(skipped.zoomStartMs).toBeNull();
    expect(openingSample(skipped, T0 + MAX_WAIT_MS)).toEqual(OPENING_DONE);
  });
});

describe('failure', () => {
  const ready = openingSceneReady(openingInitial(T0, true), T0 + READY);

  it('ends the opening from waiting, zoom and hold as skipped', () => {
    const states = [
      openingInitial(T0, true),
      ready,
      openingAdvance(ready, T0 + READY + ZOOM_MS),
    ];
    expect(states.map((s) => s.phase)).toEqual(['waiting', 'zoom', 'hold']);
    for (const s of states) {
      const failed = openingSceneFailed(s);
      expect(failed.phase).toBe('done');
      expect(failed.skipped).toBe(true);
    }
  });

  it('ends a running explosion without marking it skipped', () => {
    const failed = openingSceneFailed(openingScroll(ready, T0 + 800));
    expect(failed.phase).toBe('done');
    expect(failed.skipped).toBe(false);
  });
});

describe('openingDeadline', () => {
  it('returns the next transition timestamp per phase and null when done', () => {
    const waiting = openingInitial(T0, true);
    expect(openingDeadline(waiting)).toBe(T0 + MAX_WAIT_MS);
    const zoom = openingSceneReady(waiting, T0 + READY);
    expect(openingDeadline(zoom)).toBe(T0 + READY + ZOOM_MS);
    const hold = openingAdvance(zoom, T0 + READY + ZOOM_MS);
    expect(openingDeadline(hold)).toBe(T0 + READY + ZOOM_MS + HOLD_MS);
    const exploding = openingAdvance(hold, T0 + READY + ZOOM_MS + HOLD_MS);
    expect(openingDeadline(exploding)).toBe(T0 + READY + ZOOM_MS + HOLD_MS + EXPLODE_MS);
    expect(openingDeadline(openingAdvance(exploding, T0 + 60_000))).toBeNull();
  });
});

describe('replay', () => {
  it('a fresh initial state waits again from its own mount time', () => {
    const replay = openingInitial(T0 + 90_000, true);
    expect(replay.phase).toBe('waiting');
    expect(openingSample(replay, T0 + 90_000)).toEqual({ phase: 'waiting', zoom: 0, explode: 0 });
  });
});
