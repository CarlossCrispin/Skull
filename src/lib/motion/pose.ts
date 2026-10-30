import {
  AMBIENT_RAMP_S,
  AMBIENT_SPEED_DEG_S,
  DRIFT_X_AMPLITUDE,
  DRIFT_X_PERIOD_S,
  DRIFT_Y_AMPLITUDE,
  DRIFT_Y_PERIOD_S,
  FINAL_YAW_DEG,
  OPENING_ZOOM_START_Z,
} from './constants.ts';

/** Skull pose: yaw in radians about Y, offsets in fractions of the viewport height. */
export interface Pose {
  yaw: number;
  offsetX: number;
  offsetY: number;
  scale: number;
}

const DEG_TO_RAD = Math.PI / 180;
const TWO_PI = 2 * Math.PI;

/**
 * Ambient yaw and drift at rotation-clock time `t` (seconds, clamped at 0). The
 * angular speed ramps linearly from 0 to its steady value, so rotation starts
 * without a velocity jump. Drift sinusoids start from 0 at the same moment.
 */
export function ambient(t: number): { yaw: number; offsetX: number; offsetY: number } {
  const ta = Math.max(0, t);
  const speed = AMBIENT_SPEED_DEG_S * DEG_TO_RAD;
  const yaw =
    ta < AMBIENT_RAMP_S
      ? (speed * ta * ta) / (2 * AMBIENT_RAMP_S)
      : speed * (ta - AMBIENT_RAMP_S / 2);
  return {
    yaw,
    offsetX: DRIFT_X_AMPLITUDE * Math.sin((TWO_PI * ta) / DRIFT_X_PERIOD_S),
    offsetY: DRIFT_Y_AMPLITUDE * Math.sin((TWO_PI * ta) / DRIFT_Y_PERIOD_S),
  };
}

/**
 * Composed pose at rotation-clock time `t`: yaw = final 3/4 yaw + ambient(t),
 * offset = drift(t), scale 1. Pure: no hidden state.
 */
export function composePose(t: number): Pose {
  const drift = ambient(t);
  return {
    yaw: FINAL_YAW_DEG * DEG_TO_RAD + drift.yaw,
    offsetX: drift.offsetX,
    offsetY: drift.offsetY,
    scale: 1,
  };
}

/** Reduced-motion pose: 3/4 yaw (-30 degrees), scale 1, no offsets. */
export function staticPose(): Pose {
  return { yaw: FINAL_YAW_DEG * DEG_TO_RAD, offsetX: 0, offsetY: 0, scale: 1 };
}

/**
 * World z of the stage group during the zoom entrance: `OPENING_ZOOM_START_Z` (behind the
 * camera) at zoom 0, the origin at zoom 1, linear in between. Pure.
 */
export function zoomStageZ(zoom: number): number {
  return OPENING_ZOOM_START_Z * (1 - zoom);
}
