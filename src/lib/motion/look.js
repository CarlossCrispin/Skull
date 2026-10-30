import { clamp } from './easing.js';
import {
  LOOK_MAX_PITCH_DEG,
  LOOK_MAX_YAW_DEG,
  LOOK_ORIENTATION_NEUTRAL_BETA_DEG,
  LOOK_ORIENTATION_RANGE_DEG,
  LOOK_SMOOTH_BASE,
  LOOK_SNAP,
} from './constants.js';
import { smoothingAlpha } from './smoothing.js';

/**
 * Pointer follow: a look is a point in [-1, 1] x [-1, 1] (x right, y down, 0 = centered).
 *
 * @typedef {object} Look
 * @property {number} x
 * @property {number} y
 */

const DEG_TO_RAD = Math.PI / 180;

/** The centered look: no offset. */
export const LOOK_CENTERED = Object.freeze({ x: 0, y: 0 });

/** Pointer client coordinates to a look relative to the viewport center, clamped. Pure. */
export function normalizePointer(clientX, clientY, width, height) {
  if (!(width > 0) || !(height > 0)) {
    return LOOK_CENTERED;
  }
  return {
    x: clamp((clientX / width) * 2 - 1, -1, 1),
    y: clamp((clientY / height) * 2 - 1, -1, 1),
  };
}

function finiteOrZero(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

/** DeviceOrientation (gamma = left-right, beta = front-back, degrees) to a look, clamped. Pure. */
export function orientationToLook(gamma, beta) {
  const g = finiteOrZero(gamma);
  const b = beta === null || beta === undefined || !Number.isFinite(beta)
    ? LOOK_ORIENTATION_NEUTRAL_BETA_DEG
    : beta;
  return {
    x: clamp(g / LOOK_ORIENTATION_RANGE_DEG, -1, 1),
    y: clamp((b - LOOK_ORIENTATION_NEUTRAL_BETA_DEG) / LOOK_ORIENTATION_RANGE_DEG, -1, 1),
  };
}

/** Look to yaw/pitch offsets in radians (added on top of the base pose). Pure. */
export function lookOffset(look) {
  return {
    yaw: clamp(look.x, -1, 1) * LOOK_MAX_YAW_DEG * DEG_TO_RAD,
    pitch: clamp(look.y, -1, 1) * LOOK_MAX_PITCH_DEG * DEG_TO_RAD,
  };
}

function stepAxis(current, target, alpha) {
  const next = current + (target - current) * alpha;
  return Math.abs(target - next) < LOOK_SNAP ? target : next;
}

/** One dt-corrected smoothing tick of the look toward `target`; snaps once inside `LOOK_SNAP`. Pure. */
export function stepLook(current, target, dtSeconds) {
  const alpha = smoothingAlpha(dtSeconds, LOOK_SMOOTH_BASE);
  return { x: stepAxis(current.x, target.x, alpha), y: stepAxis(current.y, target.y, alpha) };
}

/** True when the smoothed look has reached its target (the loop may idle). */
export function lookSettled(current, target) {
  return Math.abs(target.x - current.x) < LOOK_SNAP && Math.abs(target.y - current.y) < LOOK_SNAP;
}
