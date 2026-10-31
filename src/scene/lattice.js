import { BufferGeometry, Color, Float32BufferAttribute, LineBasicMaterial, LineSegments } from 'three';
import { COLORS } from '../styles/tokens.js';
import { LATTICE_ENABLED } from './constants.js';

export const LATTICE_SCALE = 1.25;
export const LATTICE_SUBDIVISIONS = 4;

/** Grid lines of one face: `axisU`/`axisV` span the face, `axisN` is its normal at `sign`. */
function faceSegments(half, axisN, sign, out) {
  const [axisU, axisV] = [0, 1, 2].filter((a) => a !== axisN);
  const at = (u, v) => {
    const p = [0, 0, 0];
    p[axisN] = sign * half[axisN];
    p[axisU] = u;
    p[axisV] = v;
    return p;
  };
  const hu = half[axisU];
  const hv = half[axisV];
  for (let i = 0; i <= LATTICE_SUBDIVISIONS; i++) {
    const t = i / LATTICE_SUBDIVISIONS;
    out.push(...at(-hu + 2 * hu * t, -hv), ...at(-hu + 2 * hu * t, hv));
    out.push(...at(-hu, -hv + 2 * hv * t), ...at(hu, -hv + 2 * hv * t));
  }
}

/** Segment endpoints (xyz triples, two per segment) of the cage around `bounds`. Shared with the poster. */
export function latticeVertices(bounds) {
  const half = [
    (bounds.w * LATTICE_SCALE) / 2,
    (bounds.h * LATTICE_SCALE) / 2,
    (bounds.d * LATTICE_SCALE) / 2,
  ];
  const vertices = [];
  for (const axis of [0, 1, 2]) {
    faceSegments(half, axis, 1, vertices);
    faceSegments(half, axis, -1, vertices);
  }
  return vertices;
}

/** Static wireframe cage around the model (transparent so it can fade in); `null` when disabled. */
export function createLattice(bounds, enabled = LATTICE_ENABLED) {
  if (!enabled) {
    return null;
  }
  const vertices = latticeVertices(bounds);
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(vertices, 3));
  const material = new LineBasicMaterial({ color: new Color(COLORS['gray-400']), transparent: true, opacity: 1 });
  return new LineSegments(geometry, material);
}
