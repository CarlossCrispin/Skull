import { MAX_DPR, MAX_DPR_TOUCH, STAGE_SCALE, STAGE_WIDTH_SCALE } from './constants.js';

/** World height (voxel units) that fills exactly one stage side at the origin plane. */
export const MODEL_FRAME_H = 56;

/** Constant camera distance from the origin along +z. */
export const CAMERA_DISTANCE = 120;

const RAD_TO_DEG = 180 / Math.PI;

/** Side `L` of the centered square stage, in CSS pixels: the full width on portrait, 0.84 of the height otherwise. */
export function stageSide(containerW, containerH) {
  return Math.min(STAGE_WIDTH_SCALE * containerW, STAGE_SCALE * containerH);
}

/** Vertical FOV in degrees: tan(fov/2) = H * frameH / (2 * L * d). */
export function deriveFovDegrees(containerW, containerH) {
  const tanHalf = (containerH * MODEL_FRAME_H) / (2 * stageSide(containerW, containerH) * CAMERA_DISTANCE);
  return 2 * Math.atan(tanHalf) * RAD_TO_DEG;
}

/** World units spanned by one viewport height at the origin plane. */
export function worldUnitsPerViewportHeight(containerW, containerH) {
  const tanHalf = Math.tan((deriveFovDegrees(containerW, containerH) / RAD_TO_DEG) / 2);
  return 2 * CAMERA_DISTANCE * tanHalf;
}

/**
 * Pinhole projection of a world point (camera at +z looking toward -z) to
 * pixel offsets from the container center, divided by the stage side `L`.
 * +y is up. Independent of the container size by construction.
 */
export function projectNormalized(
  point,
  containerW,
  containerH,
) {
  const [x, y, z] = point;
  const tanHalf = Math.tan((deriveFovDegrees(containerW, containerH) / RAD_TO_DEG) / 2);
  const focalPx = containerH / 2 / tanHalf;
  const depth = CAMERA_DISTANCE - z;
  const scale = focalPx / depth / stageSide(containerW, containerH);
  return [x * scale, y * scale];
}

/** Renderer pixel ratio, capped at MAX_DPR, or at MAX_DPR_TOUCH on touch-only devices. */
export function capDpr(dpr, touchOnly = false) {
  return Math.min(dpr, touchOnly ? MAX_DPR_TOUCH : MAX_DPR);
}
