import { describe, expect, it } from 'vitest';
import {
  LOOK_MAX_PITCH_DEG,
  LOOK_MAX_YAW_DEG,
  LOOK_ORIENTATION_NEUTRAL_BETA_DEG,
  LOOK_ORIENTATION_RANGE_DEG,
  LOOK_SNAP,
} from './constants.js';
import {
  LOOK_CENTERED,
  lookOffset,
  lookSettled,
  normalizePointer,
  orientationToLook,
  stepLook,
} from './look.js';

const RAD = Math.PI / 180;

describe('normalizePointer', () => {
  it('maps the viewport center to (0, 0) and the corners to +-1', () => {
    expect(normalizePointer(500, 400, 1000, 800)).toEqual({ x: 0, y: 0 });
    expect(normalizePointer(0, 0, 1000, 800)).toEqual({ x: -1, y: -1 });
    expect(normalizePointer(1000, 800, 1000, 800)).toEqual({ x: 1, y: 1 });
  });

  it('clamps coordinates outside the viewport', () => {
    expect(normalizePointer(5000, -300, 1000, 800)).toEqual({ x: 1, y: -1 });
  });

  it('returns the centered look for a degenerate viewport', () => {
    expect(normalizePointer(10, 10, 0, 0)).toEqual(LOOK_CENTERED);
  });
});

describe('orientationToLook', () => {
  it('is centered at gamma 0 and the neutral beta', () => {
    expect(orientationToLook(0, LOOK_ORIENTATION_NEUTRAL_BETA_DEG)).toEqual({ x: 0, y: 0 });
  });

  it('maps gamma to yaw and beta to pitch, clamped to +-1', () => {
    expect(orientationToLook(LOOK_ORIENTATION_RANGE_DEG / 2, LOOK_ORIENTATION_NEUTRAL_BETA_DEG).x).toBeCloseTo(0.5, 9);
    expect(orientationToLook(500, LOOK_ORIENTATION_NEUTRAL_BETA_DEG).x).toBe(1);
    expect(orientationToLook(-500, 0).x).toBe(-1);
    expect(orientationToLook(0, 500).y).toBe(1);
    expect(orientationToLook(0, -500).y).toBe(-1);
  });

  it('treats missing or non-finite readings as centered', () => {
    expect(orientationToLook(null, null)).toEqual({ x: 0, y: 0 });
    expect(orientationToLook(Number.NaN, undefined)).toEqual({ x: 0, y: 0 });
  });
});

describe('lookOffset', () => {
  it('is zero when centered', () => {
    expect(lookOffset(LOOK_CENTERED)).toEqual({ yaw: 0, pitch: 0 });
  });

  it('maps full deflection to the configured maxima in radians', () => {
    expect(lookOffset({ x: 1, y: 1 })).toEqual({
      yaw: LOOK_MAX_YAW_DEG * RAD,
      pitch: LOOK_MAX_PITCH_DEG * RAD,
    });
    expect(lookOffset({ x: -1, y: -1 })).toEqual({
      yaw: -LOOK_MAX_YAW_DEG * RAD,
      pitch: -LOOK_MAX_PITCH_DEG * RAD,
    });
  });

  it('clamps out-of-range input so the offset never exceeds the maxima', () => {
    expect(lookOffset({ x: 9, y: -9 })).toEqual({
      yaw: LOOK_MAX_YAW_DEG * RAD,
      pitch: -LOOK_MAX_PITCH_DEG * RAD,
    });
  });

  it('is linear in between', () => {
    expect(lookOffset({ x: 0.5, y: 0.25 }).yaw).toBeCloseTo(0.5 * LOOK_MAX_YAW_DEG * RAD, 12);
    expect(lookOffset({ x: 0.5, y: 0.25 }).pitch).toBeCloseTo(0.25 * LOOK_MAX_PITCH_DEG * RAD, 12);
  });
});

describe('stepLook', () => {
  const target = { x: 1, y: -0.5 };

  function run(seconds, ticks, start = LOOK_CENTERED, goal = target) {
    const dt = seconds / ticks;
    let s = start;
    for (let i = 0; i < ticks; i += 1) {
      s = stepLook(s, goal, dt);
    }
    return s;
  }

  it('moves toward the target without overshoot', () => {
    const next = stepLook(LOOK_CENTERED, target, 1 / 60);
    expect(next.x).toBeGreaterThan(0);
    expect(next.x).toBeLessThan(1);
    expect(next.y).toBeLessThan(0);
    expect(next.y).toBeGreaterThan(-0.5);
  });

  it('does not move at dt = 0', () => {
    expect(stepLook({ x: 0.2, y: 0.1 }, target, 0)).toEqual({ x: 0.2, y: 0.1 });
  });

  it('is frame-rate independent: 30, 60 and 144 fps agree after one second', () => {
    const a = run(1, 30);
    const b = run(1, 60);
    const c = run(1, 144);
    expect(a.x).toBeCloseTo(b.x, 6);
    expect(c.x).toBeCloseTo(b.x, 6);
    expect(a.y).toBeCloseTo(b.y, 6);
  });

  it('converges and snaps exactly onto the target', () => {
    const done = run(5, 300);
    expect(done).toEqual(target);
    expect(lookSettled(done, target)).toBe(true);
  });

  it('eases back to 0 when the target returns to center', () => {
    const away = run(3, 180);
    const back = run(5, 300, away, LOOK_CENTERED);
    expect(back).toEqual(LOOK_CENTERED);
  });

  it('never jumps on a huge dt (clamped like the other smoothing)', () => {
    const next = stepLook(LOOK_CENTERED, { x: 1, y: 1 }, 5);
    expect(next.x).toBeLessThan(0.6);
  });
});

describe('lookSettled', () => {
  it('is true only within the snap distance on both axes', () => {
    expect(lookSettled({ x: 0, y: 0 }, { x: LOOK_SNAP / 2, y: 0 })).toBe(true);
    expect(lookSettled({ x: 0, y: 0 }, { x: LOOK_SNAP * 2, y: 0 })).toBe(false);
    expect(lookSettled({ x: 0, y: 0 }, { x: 0, y: LOOK_SNAP * 2 })).toBe(false);
  });
});
