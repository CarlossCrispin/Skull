import { staticPose } from '../../lib/motion/pose.js';
import { COLORS } from '../../styles/tokens.js';
import { VOXEL_EDGE } from '../buildSkullMesh.js';
import { LATTICE_ENABLED } from '../constants.js';
import { CAMERA_DISTANCE, projectNormalized } from '../framing.js';
import { latticeVertices } from '../lattice.js';
import { AMBIENT_INTENSITY, DIRECTIONAL_INTENSITY, LIGHT_DIRECTION } from '../lighting.js';
import { hexToRgb } from '../voxel/model.js';

/** Side of the square poster in pixels. */
export const POSTER_SIZE = 1280;

/**
 * Poster side in units of the stage side `L`. The stage frames the skull, but
 * the lattice cage is 1.25x larger and its near corners reach ~0.81 L from the
 * center, so the poster covers 1.7 L. The hero displays it centered at this
 * multiple of `L` and lets the Block A container clip it, like the canvas does.
 */
export const POSTER_EXTENT = 1.7;

/**
 * The subset of the scene pose the poster needs: yaw about Y (rad) and uniform scale.
 *
 * @typedef {object} PosterPose
 * @property {number} yaw
 * @property {number} scale
 */

/** The assembled resting pose: staticPose(), yaw -30 deg at scale 1. */
export function posterPose() {
  const { yaw, scale } = staticPose();
  return { yaw, scale };
}

/**
 * @typedef {object} Face
 * @property {readonly [Vec3, Vec3, Vec3, Vec3]} corners - World-space corners after the pose, in loop order.
 * @property {Vec3} normal - World-space unit normal.
 * @property {Rgb} rgb - Token color of the voxel (sRGB bytes).
 * @property {boolean} flat - Accent cubes are drawn unlit with their exact color.
 */

const HALF = VOXEL_EDGE / 2;

/** Cube faces as [normal axis, sign]. */
const CUBE_FACES = [
  [0, 1],
  [0, -1],
  [1, 1],
  [1, -1],
  [2, 1],
  [2, -1],
];
/** Corner offsets of a face along its two tangent axes, in loop order. */
const LOOP = [
  [-1, -1],
  [1, -1],
  [1, 1],
  [-1, 1],
];

/** Rotation about Y as three.js applies it: x' = x cos + z sin, z' = -x sin + z cos. */
function rotateY(v, cos, sin) {
  return [v[0] * cos + v[2] * sin, v[1], -v[0] * sin + v[2] * cos];
}

function axisVector(axis, sign) {
  return [axis === 0 ? sign : 0, axis === 1 ? sign : 0, axis === 2 ? sign : 0];
}

function centroid(corners) {
  const n = corners.length;
  return [
    corners.reduce((s, c) => s + c[0], 0) / n,
    corners.reduce((s, c) => s + c[1], 0) / n,
    corners.reduce((s, c) => s + c[2], 0) / n,
  ];
}

/**
 * Camera-facing faces of every voxel under `pose`, in world space. Voxels sit
 * at centered grid coordinates exactly as SkullScene lays out its instances.
 * The camera is at (0, 0, CAMERA_DISTANCE); a face is kept when it points at it.
 */
export function extractVisibleFaces(model, pose) {
  const cos = Math.cos(pose.yaw);
  const sin = Math.sin(pose.yaw);
  const { w, h, d } = model.size;
  const faces = [];
  for (let i = 0; i < model.count; i++) {
    const center = [
      model.positions[3 * i] - (w - 1) / 2,
      model.positions[3 * i + 1] - (h - 1) / 2,
      model.positions[3 * i + 2] - (d - 1) / 2,
    ];
    const rgb = [model.color[3 * i], model.color[3 * i + 1], model.color[3 * i + 2]];
    const flat = model.flat[i] === 1;
    for (const [axis, sign] of CUBE_FACES) {
      const [u, v] = [0, 1, 2].filter((a) => a !== axis);
      const normal = rotateY(axisVector(axis, sign), cos, sin);
      const corners = LOOP.map(([cu, cv]) => {
        const local = [0, 0, 0];
        local[axis] = center[axis] + sign * HALF;
        local[u] = center[u] + cu * HALF;
        local[v] = center[v] + cv * HALF;
        const turned = rotateY(local, cos, sin);
        return [turned[0] * pose.scale, turned[1] * pose.scale, turned[2] * pose.scale];
      });
      const at = centroid(corners);
      const facing = normal[0] * (0 - at[0]) + normal[1] * (0 - at[1]) + normal[2] * (CAMERA_DISTANCE - at[2]);
      if (facing > 0) {
        faces.push({ corners, normal, rgb, flat });
      }
    }
  }
  return faces;
}

const srgbToLinear = (byte) => {
  const c = byte / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};

const linearToSrgbByte = (linear) => {
  const l = Math.min(1, Math.max(0, linear));
  const c = l <= 0.0031308 ? l * 12.92 : 1.055 * l ** (1 / 2.4) - 0.055;
  return Math.round(c * 255);
};

/**
 * Flat Lambert shading with the scene's lights, as MeshLambertMaterial
 * computes it: linear color / pi * (ambient + directional * max(0, n.l)),
 * then the sRGB output transform with no tone mapping. Accent faces are unlit.
 */
export function shadeColor(rgb, normal, flat) {
  if (flat) {
    return [rgb[0], rgb[1], rgb[2]];
  }
  const nDotL = Math.max(0, normal[0] * LIGHT_DIRECTION[0] + normal[1] * LIGHT_DIRECTION[1] + normal[2] * LIGHT_DIRECTION[2]);
  const irradiance = (AMBIENT_INTENSITY + DIRECTIONAL_INTENSITY * nDotL) / Math.PI;
  const shade = (byte) => linearToSrgbByte(srgbToLinear(byte) * irradiance);
  return [shade(rgb[0]), shade(rgb[1]), shade(rgb[2])];
}

/**
 * @typedef {object} RasterOptions
 * @property {number} [size]
 * @property {PosterPose} [pose]
 * @property {boolean} [lattice] - Defaults to `LATTICE_ENABLED`.
 */

/**
 * @typedef {object} ScreenPoint
 * @property {number} x
 * @property {number} y
 * @property {number} invDepth - 1 / camera-space depth, linear in screen space.
 */

/** Projects a world point with the shared framing math (+y up, stage centered). */
function toScreen(point, size) {
  const [nx, ny] = projectNormalized(point, 1, 1);
  const pxPerStage = size / POSTER_EXTENT;
  return { x: size / 2 + nx * pxPerStage, y: size / 2 - ny * pxPerStage, invDepth: 1 / (CAMERA_DISTANCE - point[2]) };
}

class Canvas {
  size;
  pixels;
  palette = [hexToRgb(COLORS.bg)];
  depth;
  lookup = new Map();

  constructor(size) {
    this.size = size;
    this.pixels = new Uint8Array(size * size);
    this.depth = new Float64Array(size * size).fill(Infinity);
  }

  /** Palette index for `rgb`; index 0 is reserved for the transparent background. */
  indexOf(rgb) {
    const key = (rgb[0] << 16) | (rgb[1] << 8) | rgb[2];
    let index = this.lookup.get(key);
    if (index === undefined) {
      index = this.palette.length;
      this.lookup.set(key, index);
      this.palette.push([rgb[0], rgb[1], rgb[2]]);
    }
    return index;
  }

  plot(x, y, depth, index, writeDepth) {
    if (x < 0 || y < 0 || x >= this.size || y >= this.size) {
      return;
    }
    const at = y * this.size + x;
    if (depth < this.depth[at]) {
      this.pixels[at] = index;
      if (writeDepth) {
        this.depth[at] = depth;
      }
    }
  }

  /** Fills a triangle by pixel-center sampling with perspective-correct depth. */
  triangle(a, b, c, index) {
    const area = (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
    if (area === 0) {
      return;
    }
    const x0 = Math.max(0, Math.floor(Math.min(a.x, b.x, c.x)));
    const x1 = Math.min(this.size - 1, Math.ceil(Math.max(a.x, b.x, c.x)));
    const y0 = Math.max(0, Math.floor(Math.min(a.y, b.y, c.y)));
    const y1 = Math.min(this.size - 1, Math.ceil(Math.max(a.y, b.y, c.y)));
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const px = x + 0.5;
        const py = y + 0.5;
        const wa = ((b.x - px) * (c.y - py) - (b.y - py) * (c.x - px)) / area;
        const wb = ((c.x - px) * (a.y - py) - (c.y - py) * (a.x - px)) / area;
        const wc = 1 - wa - wb;
        if (wa < 0 || wb < 0 || wc < 0) {
          continue;
        }
        this.plot(x, y, 1 / (wa * a.invDepth + wb * b.invDepth + wc * c.invDepth), index, true);
      }
    }
  }

  /** One-pixel line sampled along its major axis, depth-tested against the faces. */
  line(a, b, index) {
    const steps = Math.max(1, Math.ceil(Math.max(Math.abs(b.x - a.x), Math.abs(b.y - a.y))));
    for (let k = 0; k <= steps; k++) {
      const t = k / steps;
      const invDepth = a.invDepth + (b.invDepth - a.invDepth) * t;
      this.plot(Math.floor(a.x + (b.x - a.x) * t), Math.floor(a.y + (b.y - a.y) * t), 1 / invDepth, index, false);
    }
  }
}

/**
 * Software-renders the model into an indexed image: z-buffered, flat-shaded,
 * hard-edged, index 0 transparent. With the lattice on, its segments are
 * drawn as 1 px gray-400 lines through the same projection.
 */
export function rasterizeSkull(model, options = {}) {
  const size = options.size ?? POSTER_SIZE;
  const pose = options.pose ?? posterPose();
  const canvas = new Canvas(size);

  for (const face of extractVisibleFaces(model, pose)) {
    const index = canvas.indexOf(shadeColor(face.rgb, face.normal, face.flat));
    const [p0, p1, p2, p3] = face.corners.map((corner) => toScreen(corner, size))
;
    canvas.triangle(p0, p1, p2, index);
    canvas.triangle(p0, p2, p3, index);
  }

  if (options.lattice ?? LATTICE_ENABLED) {
    const index = canvas.indexOf(hexToRgb(COLORS['gray-400']));
    const vertices = latticeVertices(model.size);
    for (let i = 0; i < vertices.length; i += 6) {
      const from = toScreen([vertices[i], vertices[i + 1], vertices[i + 2]], size);
      const to = toScreen([vertices[i + 3], vertices[i + 4], vertices[i + 5]], size);
      canvas.line(from, to, index);
    }
  }

  return { width: size, height: size, palette: canvas.palette, pixels: canvas.pixels };
}
