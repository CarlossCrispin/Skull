import { BufferGeometry, Color, Float32BufferAttribute, LineBasicMaterial, LineSegments } from 'three';
import { COLORS } from '../styles/tokens.ts';
import { LATTICE_ENABLED } from './constants.ts';

export const LATTICE_SCALE = 1.25;
export const LATTICE_SUBDIVISIONS = 4;

export interface LatticeBounds {
  readonly w: number;
  readonly h: number;
  readonly d: number;
}

type Vec3 = [number, number, number];

/** Grid lines of one face: `axisU`/`axisV` span the face, `axisN` is its normal at `sign`. */
function faceSegments(half: Vec3, axisN: number, sign: number, out: number[]): void {
  const [axisU, axisV] = [0, 1, 2].filter((a) => a !== axisN) as [number, number];
  const at = (u: number, v: number): Vec3 => {
    const p: Vec3 = [0, 0, 0];
    p[axisN] = sign * half[axisN]!;
    p[axisU] = u;
    p[axisV] = v;
    return p;
  };
  const hu = half[axisU]!;
  const hv = half[axisV]!;
  for (let i = 0; i <= LATTICE_SUBDIVISIONS; i++) {
    const t = i / LATTICE_SUBDIVISIONS;
    out.push(...at(-hu + 2 * hu * t, -hv), ...at(-hu + 2 * hu * t, hv));
    out.push(...at(-hu, -hv + 2 * hv * t), ...at(hu, -hv + 2 * hv * t));
  }
}

/** Segment endpoints (xyz triples, two per segment) of the cage around `bounds`. Shared with the poster. */
export function latticeVertices(bounds: LatticeBounds): number[] {
  const half: Vec3 = [
    (bounds.w * LATTICE_SCALE) / 2,
    (bounds.h * LATTICE_SCALE) / 2,
    (bounds.d * LATTICE_SCALE) / 2,
  ];
  const vertices: number[] = [];
  for (const axis of [0, 1, 2]) {
    faceSegments(half, axis, 1, vertices);
    faceSegments(half, axis, -1, vertices);
  }
  return vertices;
}

/** Static wireframe cage around the model (transparent so it can fade in); `null` when disabled. */
export function createLattice(bounds: LatticeBounds, enabled: boolean = LATTICE_ENABLED): LineSegments | null {
  if (!enabled) {
    return null;
  }
  const vertices = latticeVertices(bounds);
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(vertices, 3));
  const material = new LineBasicMaterial({ color: new Color(COLORS['gray-400']), transparent: true, opacity: 1 });
  return new LineSegments(geometry, material);
}
