import { describe, expect, it } from 'vitest';
import * as constants from './constants.ts';
import { AMBIENT_RAMP_S, AMBIENT_SPEED_DEG_S, FINAL_YAW_DEG } from './constants.ts';
import * as poseModule from './pose.ts';
import { ambient, composePose, staticPose, zoomStageZ } from './pose.ts';

const RAD = Math.PI / 180;
const FRAME = 1 / 60;

describe('removed intro, scrub and settle', () => {
  it('no longer exports the intro, scrub or settle terms', () => {
    for (const name of ['introYaw', 'scrub', 'settleScale']) {
      expect(Object.keys(poseModule)).not.toContain(name);
    }
    // Sanity: the module still exports the surviving API, so the check above ran against a real namespace.
    expect(Object.keys(poseModule).sort()).toEqual(['ambient', 'composePose', 'staticPose', 'zoomStageZ']);
  });

  it('no longer exports INTRO_*, SCRUB_* or SETTLE_* constants', () => {
    const names = Object.keys(constants);
    expect(names).toContain('FINAL_YAW_DEG');
    expect(names.filter((n) => /^(INTRO_|SCRUB_|SETTLE_)/.test(n))).toEqual([]);
  });
});

describe('ambient', () => {
  const speed = AMBIENT_SPEED_DEG_S * RAD;
  const yawVelocity = (t: number): number => {
    const h = 1e-4;
    return (ambient(t + h).yaw - ambient(t - h).yaw) / (2 * h);
  };

  it('is yaw 0 and drift 0 at t = 0, and clamps negative time to the start', () => {
    expect(ambient(0)).toEqual({ yaw: 0, offsetX: 0, offsetY: 0 });
    expect(ambient(-1)).toEqual({ yaw: 0, offsetX: 0, offsetY: 0 });
  });

  it('ramps velocity from 0 linearly to 6 deg/s over 1 s, then holds (velocity continuity at t = 0)', () => {
    expect(AMBIENT_SPEED_DEG_S).toBe(6);
    expect(AMBIENT_RAMP_S).toBe(1);
    expect((ambient(FRAME).yaw - ambient(0).yaw) / FRAME).toBeLessThan(speed / 50);
    expect(yawVelocity(1e-3 + 1e-3)).toBeLessThan(speed * 0.01);
    expect(yawVelocity(AMBIENT_RAMP_S / 2)).toBeCloseTo(speed / 2, 6);
    expect(yawVelocity(AMBIENT_RAMP_S + 0.5)).toBeCloseTo(speed, 6);
    expect(yawVelocity(20)).toBeCloseTo(speed, 6);
  });

  it('accumulates the ramp area (speed * ramp / 2) then speed per second', () => {
    expect(ambient(AMBIENT_RAMP_S).yaw).toBeCloseTo((speed * AMBIENT_RAMP_S) / 2, 12);
    expect(ambient(AMBIENT_RAMP_S + 10).yaw).toBeCloseTo(speed * (10 + AMBIENT_RAMP_S / 2), 12);
  });

  it('drifts on both axes with the configured periods, starting from zero at t = 0', () => {
    expect(ambient(9 / 4).offsetY).toBeCloseTo(0.02, 12);
    expect(ambient(13 / 4).offsetX).toBeCloseTo(0.015, 12);
    expect(ambient(9).offsetY).toBeCloseTo(0, 12);
    expect(ambient(13).offsetX).toBeCloseTo(0, 12);
  });
});

describe('staticPose', () => {
  it('is the 3/4 pose: yaw -30 degrees, scale 1, no offsets', () => {
    expect(FINAL_YAW_DEG).toBe(-30);
    expect(staticPose().yaw).toBeCloseTo(-30 * RAD, 12);
    expect(staticPose()).toEqual({ yaw: FINAL_YAW_DEG * RAD, offsetX: 0, offsetY: 0, scale: 1 });
  });
});

describe('composePose', () => {
  it('takes only the rotation clock and is pure', () => {
    expect(composePose.length).toBe(1);
    expect(composePose(1.5)).toEqual(composePose(1.5));
  });

  it('is yaw = FINAL_YAW + ambient(t).yaw, offsets = drift, scale exactly 1', () => {
    for (const t of [0, 0.7, 2.8, 4.1, 12.5, 45]) {
      const a = ambient(t);
      const pose = composePose(t);
      expect(pose.yaw).toBe(FINAL_YAW_DEG * RAD + a.yaw);
      expect(pose.offsetX).toBe(a.offsetX);
      expect(pose.offsetY).toBe(a.offsetY);
      expect(pose.scale).toBe(1);
    }
    expect(ambient(12.5).yaw).toBeGreaterThan(0);
  });

  it('composePose(0) equals the static pose (yaw -30 degrees, scale 1)', () => {
    expect(composePose(0)).toEqual(staticPose());
    expect(composePose(0).yaw).toBeCloseTo(-30 * RAD, 12);
  });

  it('turns at most the ambient speed per frame: no sweep, no jump', () => {
    const speed = AMBIENT_SPEED_DEG_S * RAD;
    let maxStep = 0;
    for (let t = 0; t < 10; t += FRAME) {
      maxStep = Math.max(maxStep, Math.abs(composePose(t + FRAME).yaw - composePose(t).yaw));
    }
    expect(maxStep).toBeLessThanOrEqual(speed * FRAME + 1e-9);
    expect(maxStep).toBeGreaterThan(speed * FRAME * 0.99);
  });

  it('keeps drift within +-2% on Y and +-1.5% on X over 60 s and actually reaches the amplitudes', () => {
    let maxX = 0;
    let maxY = 0;
    for (let t = 0; t <= 60; t += 0.01) {
      const pose = composePose(t);
      maxX = Math.max(maxX, Math.abs(pose.offsetX));
      maxY = Math.max(maxY, Math.abs(pose.offsetY));
    }
    expect(maxY).toBeLessThanOrEqual(0.02 + 1e-12);
    expect(maxX).toBeLessThanOrEqual(0.015 + 1e-12);
    expect(maxY).toBeGreaterThan(0.0199);
    expect(maxX).toBeGreaterThan(0.0149);
  });

  it('ambient yaw wrapping modulo 360 degrees does not change the rendered pose', () => {
    const t = AMBIENT_RAMP_S + 3;
    const period = 360 / AMBIENT_SPEED_DEG_S;
    const base = composePose(t);
    const wrapped = composePose(t + period);
    expect(wrapped.yaw - base.yaw).toBeCloseTo(2 * Math.PI, 9);
    expect(Math.sin(wrapped.yaw)).toBeCloseTo(Math.sin(base.yaw), 9);
    expect(Math.cos(wrapped.yaw)).toBeCloseTo(Math.cos(base.yaw), 9);
  });
});

describe('zoomStageZ', () => {
  it('starts behind the camera at 150 and ends at the origin', () => {
    expect(constants.OPENING_ZOOM_START_Z).toBe(150);
    expect(zoomStageZ(0)).toBe(150);
    expect(zoomStageZ(1)).toBe(0);
  });

  it('is 150 (1 - x) in between and strictly decreasing', () => {
    expect(zoomStageZ(0.5)).toBeCloseTo(75, 12);
    expect(zoomStageZ(0.2)).toBeCloseTo(120, 12);
    let prev = zoomStageZ(0);
    for (let i = 1; i <= 20; i += 1) {
      const z = zoomStageZ(i / 20);
      expect(z).toBeLessThan(prev);
      prev = z;
    }
  });
});
