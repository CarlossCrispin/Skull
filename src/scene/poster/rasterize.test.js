import { Euler, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { staticPose } from '../../lib/motion/pose.js';
import { COLORS } from '../../styles/tokens.js';
import { LATTICE_ENABLED } from '../constants.js';
import { projectNormalized } from '../framing.js';
import { LIGHT_DIRECTION } from '../lighting.js';
import { hexToRgb, toneRgb } from '../voxel/model.js';
import { extractVisibleFaces, POSTER_EXTENT, POSTER_SIZE, posterPose, rasterizeSkull, shadeColor } from './rasterize.js';

const SIZE = { w: 48, h: 56, d: 44 };
const SHOT = 800;
const FRONT = { yaw: 0, scale: 1 };

/**
 * @typedef {object} Cube
 * @property {[number, number, number]} at - Grid coordinates.
 * @property {number} [tone]
 * @property {string} [accent]
 */

function modelOf(cubes) {
  const positions = new Int16Array(cubes.length * 3);
  const tone = new Uint8Array(cubes.length);
  const flat = new Uint8Array(cubes.length);
  const color = new Uint8Array(cubes.length * 3);
  cubes.forEach((cube, i) => {
    positions.set(cube.at, 3 * i);
    tone[i] = cube.tone ?? 0;
    flat[i] = cube.accent === undefined ? 0 : 1;
    color.set(cube.accent === undefined ? toneRgb(cube.tone ?? 0) : hexToRgb(cube.accent), 3 * i);
  });
  return { size: SIZE, count: cubes.length, positions, tone, tile: new Uint8Array(cubes.length), flat, color };
}

/** Centered world position of a grid cell, as SkullScene lays instances out. */
const worldOf = ([x, y, z]) => [
  x - (SIZE.w - 1) / 2,
  y - (SIZE.h - 1) / 2,
  z - (SIZE.d - 1) / 2,
];

/** Pixel containing a world point, using the shared framing math. */
function pixelOf(point, size) {
  const [nx, ny] = projectNormalized(point, 1, 1);
  const pxPerStage = size / POSTER_EXTENT;
  return [Math.floor(size / 2 + nx * pxPerStage), Math.floor(size / 2 - ny * pxPerStage)];
}

const indexAt = (image, x, y) => image.pixels[y * image.width + x];
const colorAt = (image, x, y) => image.palette[indexAt(image, x, y)];
const normalKeys = (faces) =>
  faces.map((f) => f.normal.map((c) => Math.round(c).toString()).join(',')).sort();
const filled = (image) => image.pixels.reduce((n, p) => n + (p === 0 ? 0 : 1), 0);

describe('extractVisibleFaces', () => {
  it('keeps only camera-facing faces of a cube right of and above the view axis', () => {
    const faces = extractVisibleFaces(modelOf([{ at: [29, 38, 22] }]), FRONT);
    expect(normalKeys(faces)).toEqual(['-1,0,0', '0,-1,0', '0,0,1']);
    expect(faces.every((f) => f.corners.length === 4)).toBe(true);
  });

  it('shows the opposite side face for a cube left of the view axis', () => {
    const faces = extractVisibleFaces(modelOf([{ at: [18, 38, 22] }]), FRONT);
    expect(normalKeys(faces)).toEqual(['0,-1,0', '0,0,1', '1,0,0']);
  });

  it('places face corners 0.9 apart around the cube center', () => {
    const [face] = extractVisibleFaces(modelOf([{ at: [29, 38, 22] }]), FRONT).filter((f) => f.normal[2] > 0.5);
    const [cx, cy, cz] = worldOf([29, 38, 22]);
    const xs = face.corners.map((c) => c[0]);
    const ys = face.corners.map((c) => c[1]);
    expect(Math.min(...xs)).toBeCloseTo(cx - 0.45, 9);
    expect(Math.max(...xs)).toBeCloseTo(cx + 0.45, 9);
    expect(Math.min(...ys)).toBeCloseTo(cy - 0.45, 9);
    expect(Math.max(...ys)).toBeCloseTo(cy + 0.45, 9);
    for (const corner of face.corners) {
      expect(corner[2]).toBeCloseTo(cz + 0.45, 9);
    }
  });

  it('turns faces and corners exactly like three.js rotation.y (same handedness as the canvas)', () => {
    const yaw = 0.7;
    const euler = new Euler(0, yaw, 0);
    const [front] = extractVisibleFaces(modelOf([{ at: [24, 28, 22] }]), { yaw, scale: 1 }).filter((f) => f.normal[2] > 0.7);
    const expectedNormal = new Vector3(0, 0, 1).applyEuler(euler);
    expect(front.normal[0]).toBeCloseTo(expectedNormal.x, 12);
    expect(front.normal[1]).toBeCloseTo(expectedNormal.y, 12);
    expect(front.normal[2]).toBeCloseTo(expectedNormal.z, 12);
    const [cx, cy, cz] = worldOf([24, 28, 22]);
    const expectedCorner = new Vector3(cx + 0.45, cy - 0.45, cz + 0.45).applyEuler(euler);
    const corner = front.corners.find((c) => Math.abs(c[0] - expectedCorner.x) < 1e-9 && Math.abs(c[2] - expectedCorner.z) < 1e-9);
    expect(corner).toBeDefined();
    expect(corner[1]).toBeCloseTo(expectedCorner.y, 12);
  });

  it('rotates the cube about Y and scales it about the origin', () => {
    const turned = extractVisibleFaces(modelOf([{ at: [18, 38, 22] }]), { yaw: Math.PI / 2, scale: 1 });
    expect(normalKeys(turned)).toEqual(['-1,0,0', '0,-1,0', '0,0,1']);
    const [front] = extractVisibleFaces(modelOf([{ at: [29, 38, 22] }]), { yaw: 0, scale: 2 }).filter(
      (f) => f.normal[2] > 0.5,
    );
    expect(front.corners[0][2]).toBeCloseTo(2 * (worldOf([29, 38, 22])[2] + 0.45), 9);
  });

  it('flags accent cubes as flat with their exact token color', () => {
    const [face] = extractVisibleFaces(modelOf([{ at: [24, 28, 22], accent: COLORS.accent }]), FRONT);
    expect(face.flat).toBe(true);
    expect(face.rgb).toEqual([0x8e, 0x4a, 0xf2]);
    const [lit] = extractVisibleFaces(modelOf([{ at: [24, 28, 22], tone: 2 }]), FRONT);
    expect(lit.flat).toBe(false);
    expect(lit.rgb).toEqual([0x88, 0x88, 0x88]);
  });
});

describe('shadeColor', () => {
  it('applies ambient only to a face turned away from the light (Lambert / pi, linear light)', () => {
    expect(shadeColor([136, 136, 136], [0, 0, -1], false)).toEqual([75, 75, 75]);
    expect(shadeColor([216, 216, 216], [0, 0, -1], false)).toEqual([123, 123, 123]);
  });

  it('adds the directional term by n.l for lit faces', () => {
    expect(shadeColor([216, 216, 216], [0, 0, 1], false)).toEqual([171, 171, 171]);
    expect(shadeColor([136, 136, 136], [-1, 0, 0], false)).toEqual([134, 134, 134]);
    expect(shadeColor([136, 136, 136], LIGHT_DIRECTION, false)).toEqual([143, 143, 143]);
  });

  it('leaves accent faces at their exact color whatever the normal', () => {
    expect(shadeColor([0x8e, 0x4a, 0xf2], [0, 0, 1], true)).toEqual([0x8e, 0x4a, 0xf2]);
    expect(shadeColor([0xe2, 0x68, 0x0a], [0, 0, -1], true)).toEqual([0xe2, 0x68, 0x0a]);
  });
});

describe('posterPose', () => {
  it('is the assembled static pose: staticPose(), yaw -30 deg (the old -390 deg was equivalent), scale 1', () => {
    const pose = posterPose();
    const rest = staticPose();
    expect(pose.yaw).toBe(rest.yaw);
    expect(pose.scale).toBe(rest.scale);
    expect(rest.offsetX).toBe(0);
    expect(rest.offsetY).toBe(0);
    expect(pose.yaw).toBeCloseTo((-30 * Math.PI) / 180, 12);
    expect(Math.cos(pose.yaw)).toBeCloseTo(Math.cos(Math.PI / 6), 12);
    expect(Math.sin(pose.yaw)).toBeCloseTo(-0.5, 12);
    expect(pose.scale).toBe(1);
  });
});

describe('POSTER_EXTENT', () => {
  it('covers the near corners of the lattice cage, which lie beyond the stage', () => {
    // Front corner (30, 35, 27.5): normalized offset in units of L, per the shared framing.
    const [nx, ny] = projectNormalized([30, 35, 27.5], 1, 1);
    expect(Math.abs(ny)).toBeGreaterThan(0.5);
    expect(Math.abs(nx)).toBeLessThan(POSTER_EXTENT / 2);
    expect(Math.abs(ny)).toBeLessThan(POSTER_EXTENT / 2);
  });
});

describe('rasterizeSkull', () => {
  it('projects with the shared framing math: the cube center lands on its projected pixel', () => {
    const image = rasterizeSkull(modelOf([{ at: [24, 28, 22] }]), { size: SHOT, pose: FRONT, lattice: false });
    const [px, py] = pixelOf(worldOf([24, 28, 22]), SHOT);
    expect(indexAt(image, px, py)).not.toBe(0);
    expect(colorAt(image, px, py)).toEqual([...shadeColor(toneRgb(0), [0, 0, 1], false)]);
    const [ox, oy] = pixelOf(worldOf([30, 28, 22]), SHOT);
    expect(indexAt(image, ox, oy)).toBe(0);
  });

  it('makes the background palette index 0 and projects farther cubes smaller (perspective)', () => {
    const big = 2400;
    const near = rasterizeSkull(modelOf([{ at: [24, 28, 42] }]), { size: big, pose: FRONT, lattice: false });
    const far = rasterizeSkull(modelOf([{ at: [24, 28, 2] }]), { size: big, pose: FRONT, lattice: false });
    expect(near.pixels[0]).toBe(0);
    expect(far.pixels[0]).toBe(0);
    const ratio = filled(near) / filled(far);
    // Face depths ~99 vs ~139: area ratio (139/99)^2 = 1.97 up to +-1 px per side (27x27 vs 20x20 here);
    // an orthographic projection would give exactly 1.
    expect(ratio).toBeGreaterThan(1.7);
    expect(ratio).toBeLessThan(2.1);
  });

  it('lets the nearest face win the z-buffer regardless of submission order', () => {
    const front = { at: [24, 28, 32], tone: 0 };
    const back = { at: [24, 28, 12], tone: 3 };
    const [px, py] = pixelOf(worldOf([24, 28, 32]), SHOT);
    for (const cubes of [[front, back], [back, front]]) {
      const image = rasterizeSkull(modelOf(cubes), { size: SHOT, pose: FRONT, lattice: false });
      expect(colorAt(image, px, py)).toEqual([...shadeColor(toneRgb(0), [0, 0, 1], false)]);
    }
    const alone = rasterizeSkull(modelOf([back]), { size: SHOT, pose: FRONT, lattice: false });
    expect(colorAt(alone, px, py)).toEqual([...shadeColor(toneRgb(3), [0, 0, 1], false)]);
  });

  it('draws hard edges: only palette entries from the shaded faces, no blended colors', () => {
    const model = modelOf([{ at: [29, 38, 22] }, { at: [18, 20, 30], tone: 1 }]);
    const image = rasterizeSkull(model, { size: SHOT, pose: { yaw: 0.5, scale: 1 }, lattice: false });
    const allowed = new Set(
      extractVisibleFaces(model, { yaw: 0.5, scale: 1 }).map((f) => shadeColor(f.rgb, f.normal, f.flat).join(',')),
    );
    const used = new Set(image.pixels);
    expect(used.has(0)).toBe(true);
    expect(used.size).toBeGreaterThan(2);
    for (const index of used) {
      if (index !== 0) {
        expect(allowed.has(image.palette[index].join(','))).toBe(true);
      }
    }
  });

  it('renders accent cubes with the exact token hex, not shaded', () => {
    for (const hex of [COLORS.accent, COLORS.signal]) {
      const image = rasterizeSkull(modelOf([{ at: [24, 28, 22], accent: hex }]), {
        size: SHOT,
        pose: { yaw: 0.3, scale: 1 },
        lattice: false,
      });
      const [px, py] = pixelOf(worldOf([24, 28, 22]), SHOT);
      expect(colorAt(image, px, py)).toEqual(hexToRgb(hex));
    }
  });

  it('keeps through-holes at index 0 (transparent) where no cube lies behind', () => {
    const ring = [];
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        if (dx !== 0 || dy !== 0) {
          ring.push({ at: [24 + dx, 28 + dy, 22] });
        }
      }
    }
    const image = rasterizeSkull(modelOf(ring), { size: SHOT, pose: FRONT, lattice: false });
    const [hx, hy] = pixelOf(worldOf([24, 28, 22]), SHOT);
    expect(indexAt(image, hx, hy)).toBe(0);
    const [rx, ry] = pixelOf(worldOf([25, 28, 22]), SHOT);
    expect(indexAt(image, rx, ry)).not.toBe(0);
    const filledHole = rasterizeSkull(modelOf([...ring, { at: [24, 28, 22] }]), { size: SHOT, pose: FRONT, lattice: false });
    expect(indexAt(filledHole, hx, hy)).not.toBe(0);
  });

  it('draws the lattice with the same projection: 1 px gray-400 line on the front top edge', () => {
    expect(LATTICE_ENABLED).toBe(true);
    const model = modelOf([{ at: [24, 28, 22] }]);
    const on = rasterizeSkull(model, { size: SHOT, pose: FRONT, lattice: true });
    const off = rasterizeSkull(model, { size: SHOT, pose: FRONT, lattice: false });
    // Front-top edge of the cage: y = +35, z = +27.5, any x between the corners.
    const [px, py] = pixelOf([5, 35, 27.5], SHOT);
    expect(colorAt(on, px, py)).toEqual(hexToRgb(COLORS['gray-400']));
    expect(indexAt(off, px, py)).toBe(0);
    // 1 px thick: the rows two pixels above and below are background.
    expect(indexAt(on, px, py - 2)).toBe(0);
    expect(indexAt(on, px, py + 2)).toBe(0);
  });

  it('defaults the lattice to LATTICE_ENABLED and the pose to the poster pose', () => {
    const model = modelOf([{ at: [24, 28, 22] }]);
    const implicit = rasterizeSkull(model, { size: SHOT });
    const explicit = rasterizeSkull(model, { size: SHOT, pose: posterPose(), lattice: LATTICE_ENABLED });
    expect([...implicit.pixels]).toEqual([...explicit.pixels]);
    expect(implicit.palette).toEqual(explicit.palette);
    expect(POSTER_SIZE).toBeGreaterThanOrEqual(512);
    expect(POSTER_EXTENT).toBe(1.7);
  });

  it('hides lattice segments behind the skull (depth-tested) and shows them elsewhere', () => {
    // Back-face vertical grid line at x = 15, z = -27.5 passes behind the cubes at x ~ 12.5.
    const wall = [{ at: [35, 28, 22] }, { at: [36, 28, 22] }, { at: [37, 28, 22] }];
    const [px, py] = pixelOf([15, 0.6173, -27.5], SHOT);
    const hidden = rasterizeSkull(modelOf(wall), { size: SHOT, pose: FRONT, lattice: true });
    const open = rasterizeSkull(modelOf([{ at: [5, 10, 22] }]), { size: SHOT, pose: FRONT, lattice: true });
    expect(colorAt(open, px, py)).toEqual(hexToRgb(COLORS['gray-400']));
    expect(colorAt(hidden, px, py)).toEqual([...shadeColor(toneRgb(0), [0, 0, 1], false)]);
  });
});
