import {
  opSmoothUnion,
  opSubtract,
  opUnion,
  sdBox,
  sdEllipsoid,
  sdRoundBox,
  sdTriPrism,
} from './sdf.ts';

/** Voxel grid size; indices are integers, y grows upward. */
export const GRID_W = 48;
export const GRID_H = 56;
export const GRID_D = 44;

/** Grid center in index space; centered coordinates are `index - CENTER`. */
export const CENTER: readonly [number, number, number] = [23.5, 27.5, 21.5];

/** Eye-socket center (x of the right socket, y) in centered coordinates. */
export const EYE_SOCKET_CENTER: readonly [number, number] = [9.5, 0.5];
const EYE_SOCKET_RADII: readonly [number, number] = [6.5, 5.5];

/**
 * The socket keeps its full section up to SOCKET_FULL_Z, then narrows linearly toward the
 * back down to SOCKET_BACK_SCALE, so the tunnel runs front to back inside the cranium and
 * the temple wall stays closed (a straight prism would break out through the side).
 */
const SOCKET_FULL_Z = 0;
const SOCKET_BACK_Z = -8;
const SOCKET_BACK_SCALE = 0.25;

function socketScale(cz: number): number {
  if (cz >= SOCKET_FULL_Z) {
    return 1;
  }
  const t = Math.min((SOCKET_FULL_Z - cz) / (SOCKET_FULL_Z - SOCKET_BACK_Z), 1);
  return 1 - t * (1 - SOCKET_BACK_SCALE);
}

/** Nasal cavity center (x, y) in centered coordinates; inverted triangle (apex up). */
export const NASAL_CENTER: readonly [number, number] = [0, -8];
const NASAL_HALF_WIDTH = 3.5;
const NASAL_HALF_HEIGHT = 4.5;

/** Large enough to behave as a through-hole along z inside the grid. */
const THROUGH = 1000;
const SMOOTH_K = 2;
const CRANIUM_HALF_DEPTH = 19.5;

/** Mouth slit: shallow box carved from the front only. */
const MOUTH_CENTER: readonly [number, number, number] = [0, -19, 12];
const MOUTH_HALF: readonly [number, number, number] = [8, 1, 9];

/** Teeth: a gap every third canonical column (c % 3 === 1), 1 voxel wide. */
const TOOTH_PERIOD = 3;
const TOOTH_GAP_PHASE = 1;

/** Tooth rows (centered y ranges) whose gap columns are cut through the whole depth. */
const UPPER_TEETH_Y: readonly [number, number] = [-18, -13];
const LOWER_TEETH_Y: readonly [number, number] = [-25, -20];
const UPPER_TEETH_HALF_WIDTH = 10;
const LOWER_TEETH_HALF_WIDTH = 7;

/**
 * Mandible: angled jaw line. Half-width is constant down to the jaw angle, then tapers
 * linearly to the chin, extruded in depth.
 */
const JAW_TOP_Y = -8;
const JAW_ANGLE_Y = -17;
const JAW_CHIN_Y = -28;
const JAW_ANGLE_HALF_WIDTH = 12;
const JAW_CHIN_HALF_WIDTH = 7;
const JAW_CENTER_Z = -1;
const JAW_HALF_DEPTH = 8;

function jawHalfWidth(cy: number): number {
  if (cy >= JAW_ANGLE_Y) {
    return JAW_ANGLE_HALF_WIDTH;
  }
  const t = Math.min((JAW_ANGLE_Y - cy) / (JAW_ANGLE_Y - JAW_CHIN_Y), 1);
  return JAW_ANGLE_HALF_WIDTH + t * (JAW_CHIN_HALF_WIDTH - JAW_ANGLE_HALF_WIDTH);
}

function mandibleDistance(x: number, cy: number, cz: number): number {
  const slope = (JAW_ANGLE_HALF_WIDTH - JAW_CHIN_HALF_WIDTH) / (JAW_ANGLE_Y - JAW_CHIN_Y);
  const side = (x - jawHalfWidth(cy)) / Math.hypot(1, slope);
  const middle = (JAW_TOP_Y + JAW_CHIN_Y) / 2;
  const vertical = Math.abs(cy - middle) - (JAW_TOP_Y - JAW_CHIN_Y) / 2;
  return Math.max(side, vertical, Math.abs(cz - JAW_CENTER_Z) - JAW_HALF_DEPTH);
}

function inRange(v: number, [lo, hi]: readonly [number, number]): boolean {
  return v >= lo && v <= hi;
}

/** Negative inside a 1-voxel tooth gap slot, which runs through the full depth. */
function toothGapSlot(cx: number, cy: number): number {
  const x = Math.abs(cx);
  const inUpper = inRange(cy, UPPER_TEETH_Y) && x <= UPPER_TEETH_HALF_WIDTH;
  const inLower = inRange(cy, LOWER_TEETH_Y) && x <= LOWER_TEETH_HALF_WIDTH;
  return (inUpper || inLower) && isToothGap(cx) ? -1 : 1;
}

function isToothGap(cx: number): boolean {
  const canonical = Math.round(CENTER[0] - Math.abs(cx));
  return canonical % TOOTH_PERIOD === TOOTH_GAP_PHASE;
}

function eyeSocketDistance(cx: number, cy: number, cz: number): number {
  const s = socketScale(cz);
  return sdEllipsoid(
    Math.abs(cx) - EYE_SOCKET_CENTER[0],
    cy - EYE_SOCKET_CENTER[1],
    0,
    EYE_SOCKET_RADII[0] * s,
    EYE_SOCKET_RADII[1] * s,
    THROUGH,
  );
}

function nasalDistance(cx: number, cy: number, cz: number): number {
  return sdTriPrism(
    Math.abs(cx) - NASAL_CENTER[0],
    cy - NASAL_CENTER[1],
    cz,
    NASAL_HALF_WIDTH,
    NASAL_HALF_HEIGHT,
    Infinity,
  );
}

function mouthDistance(cx: number, cy: number, cz: number): number {
  return sdBox(
    Math.abs(cx) - MOUTH_CENTER[0],
    cy - MOUTH_CENTER[1],
    cz - MOUTH_CENTER[2],
    MOUTH_HALF[0],
    MOUTH_HALF[1],
    MOUTH_HALF[2],
  );
}

export function inEyeSocket(cx: number, cy: number, cz: number): boolean {
  return eyeSocketDistance(cx, cy, cz) < 0;
}

export function inNasalCavity(cx: number, cy: number, cz: number): boolean {
  return nasalDistance(cx, cy, cz) < 0;
}

export function inMouthSlit(cx: number, cy: number, cz: number): boolean {
  return mouthDistance(cx, cy, cz) < 0;
}

/** Tooth block distance; gap columns are reported as open (positive). */
function teethDistance(cx: number, cy: number, cz: number): number {
  const x = Math.abs(cx);
  const upper = sdBox(x, cy + 15.5, cz - 8, UPPER_TEETH_HALF_WIDTH, 2.5, 5);
  const lower = sdBox(x, cy + 22.5, cz - 8, LOWER_TEETH_HALF_WIDTH, 2.5, 4.5);
  const d = opUnion(upper, lower);
  return isToothGap(cx) ? Math.max(d, 1) : d;
}

/** Pushes the cranium depth profile toward a squarer section (exponent 3 instead of 2) so the temples stay wide. */
function squareDepth(z: number): number {
  return Math.sign(z) * CRANIUM_HALF_DEPTH * Math.pow(Math.abs(z) / CRANIUM_HALF_DEPTH, 1.5);
}

/**
 * Signed distance of the skull in voxel units, negative inside. Coordinates
 * are centered (index minus CENTER), y up, +z toward the viewer. X mirror is
 * built in through |x|.
 */
export function skullSdf(cx: number, cy: number, cz: number): number {
  const x = Math.abs(cx);
  const cranium = sdEllipsoid(x, cy - 9.5, squareDepth(cz + 1.5), 22, 17.5, 19.5);
  const facePlate = sdRoundBox(x, cy - 1.5, cz - 5, 18, 10.5, 9, 3);
  const cheek = sdEllipsoid(x - 14.5, cy + 4, cz - 6, 6.5, 4.5, 6);
  const maxilla = sdRoundBox(x, cy + 9.5, cz - 2, 11.5, 4.5, 11, 1);
  const mandible = mandibleDistance(x, cy, cz);

  let d = opSmoothUnion(cranium, facePlate, SMOOTH_K);
  d = opSmoothUnion(d, cheek, SMOOTH_K);
  d = opSmoothUnion(d, maxilla, SMOOTH_K);
  d = opSmoothUnion(d, mandible, SMOOTH_K);
  d = opUnion(d, teethDistance(cx, cy, cz));
  d = opSubtract(d, toothGapSlot(cx, cy));

  d = opSubtract(d, eyeSocketDistance(cx, cy, cz));
  d = opSubtract(d, nasalDistance(cx, cy, cz));
  d = opSubtract(d, mouthDistance(cx, cy, cz));
  return d;
}

/** Distance to the nearest subtracted cavity (sockets, nose, mouth slit); negative inside one. */
export function cavityDistance(cx: number, cy: number, cz: number): number {
  return Math.min(eyeSocketDistance(cx, cy, cz), nasalDistance(cx, cy, cz), mouthDistance(cx, cy, cz));
}
