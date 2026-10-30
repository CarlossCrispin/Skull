import { describe, expect, it } from 'vitest';
import { MAX_DPR, STAGE_SCALE } from './constants.js';
import {
  CAMERA_DISTANCE,
  MODEL_FRAME_H,
  capDpr,
  deriveFovDegrees,
  projectNormalized,
  stageSide,
  worldUnitsPerViewportHeight,
} from './framing.js';

const DESKTOP = { w: 1440, h: 900 };
const MOBILE = { w: 390, h: 844 };

// Model corners (grid half-extents 48x56x44 -> 24, 28, 22).
const CORNERS = [
  [24, 28, 22],
  [-24, -28, 22],
  [24, -28, -22],
  [-24, 28, -22],
];

describe('stageSide', () => {
  it('is STAGE_SCALE times the shorter container side', () => {
    expect(STAGE_SCALE).toBe(0.84);
    expect(stageSide(1440, 900)).toBeCloseTo(STAGE_SCALE * 900, 9);
    expect(stageSide(390, 844)).toBeCloseTo(STAGE_SCALE * 390, 9);
  });
});

describe('padded framing', () => {
  it.each([DESKTOP, MOBILE])('makes the model frame span STAGE_SCALE of the short side at $w x $h', ({ w, h }) => {
    const [, top] = projectNormalized([0, MODEL_FRAME_H / 2, 0], w, h);
    const [right] = projectNormalized([MODEL_FRAME_H / 2, 0, 0], w, h);
    // Normalized by L = STAGE_SCALE * min(w, h); the frame edge sits at 0.5 L from the center.
    expect(top * stageSide(w, h) * 2).toBeCloseTo(STAGE_SCALE * Math.min(w, h), 6);
    expect(right * stageSide(w, h) * 2).toBeCloseTo(STAGE_SCALE * Math.min(w, h), 6);
    // Padding: the frame leaves (1 - STAGE_SCALE) / 2 of the short side free on each side.
    expect(Math.min(w, h) / 2 - top * stageSide(w, h)).toBeCloseTo(((1 - STAGE_SCALE) / 2) * Math.min(w, h), 6);
  });

  it('projects the model corners identically (normalized by L) at both viewports', () => {
    for (const [x, y, z] of CORNERS) {
      const a = projectNormalized([x, y, z], DESKTOP.w, DESKTOP.h);
      const b = projectNormalized([x, y, z], MOBILE.w, MOBILE.h);
      expect(Math.abs(a[0] - b[0])).toBeLessThan(1e-6);
      expect(Math.abs(a[1] - b[1])).toBeLessThan(1e-6);
    }
  });
});

describe('scale-invariant framing', () => {
  it('projects model corners identically (normalized by L) at 1440x900 and 390x844', () => {
    for (const [x, y, z] of CORNERS) {
      const a = projectNormalized([x, y, z], DESKTOP.w, DESKTOP.h);
      const b = projectNormalized([x, y, z], MOBILE.w, MOBILE.h);
      expect(Math.abs(a[0] - b[0])).toBeLessThan(1e-6);
      expect(Math.abs(a[1] - b[1])).toBeLessThan(1e-6);
    }
  });

  it('matches the closed-form pinhole projection d / frameH * p / (d - z)', () => {
    const [x, y, z] = CORNERS[0];
    const [nx, ny] = projectNormalized([x, y, z], DESKTOP.w, DESKTOP.h);
    const k = CAMERA_DISTANCE / MODEL_FRAME_H / (CAMERA_DISTANCE - z);
    expect(nx).toBeCloseTo(x * k, 6);
    expect(ny).toBeCloseTo(y * k, 6);
  });

  it('makes a plane of MODEL_FRAME_H at the origin span exactly the stage side', () => {
    const [, top] = projectNormalized([0, MODEL_FRAME_H / 2, 0], DESKTOP.w, DESKTOP.h);
    expect(top).toBeCloseTo(0.5, 9);
  });

  it('derives a different FOV per container height but keeps the distance constant', () => {
    const fovDesktop = deriveFovDegrees(DESKTOP.w, DESKTOP.h);
    const fovMobile = deriveFovDegrees(MOBILE.w, MOBILE.h);
    expect(fovDesktop).toBeGreaterThan(0);
    expect(fovMobile).toBeGreaterThan(fovDesktop);
    // tan(fov/2) = H * frameH / (2 L d)
    const expected = (DESKTOP.h * MODEL_FRAME_H) / (2 * stageSide(DESKTOP.w, DESKTOP.h) * CAMERA_DISTANCE);
    expect(Math.tan((fovDesktop * Math.PI) / 360)).toBeCloseTo(expected, 9);
  });
});

describe('worldUnitsPerViewportHeight', () => {
  it('equals the visible world height at the origin plane', () => {
    for (const { w, h } of [DESKTOP, MOBILE]) {
      const fov = deriveFovDegrees(w, h);
      const visible = 2 * CAMERA_DISTANCE * Math.tan((fov * Math.PI) / 360);
      expect(worldUnitsPerViewportHeight(w, h)).toBeCloseTo(visible, 9);
    }
  });

  it('scales a fraction of viewport height into the matching stage fraction', () => {
    // 1% of the viewport height, expressed in world units, spans 0.01 * H / L stage sides.
    const world = 0.01 * worldUnitsPerViewportHeight(DESKTOP.w, DESKTOP.h);
    const stageFraction = (world / MODEL_FRAME_H) * 1; // fraction of one stage side
    expect(stageFraction).toBeCloseTo((0.01 * DESKTOP.h) / stageSide(DESKTOP.w, DESKTOP.h), 9);
  });
});

describe('capDpr', () => {
  it('caps at MAX_DPR', () => {
    expect(MAX_DPR).toBe(2);
    expect(capDpr(3)).toBe(2);
    expect(capDpr(1.5)).toBe(1.5);
    expect(capDpr(1)).toBe(1);
  });
});
