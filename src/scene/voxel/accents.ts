import { COLORS } from '../../styles/tokens.ts';
import { GRID_W } from './skullSdf.ts';

/** D6 (approved 2026-10-27), front view: viewer-left socket violet, viewer-right socket orange. */
export const ACCENT_VIEWER_LEFT_HEX = COLORS.accent;
export const ACCENT_VIEWER_RIGHT_HEX = COLORS.signal;
export const ACCENT_CUBES_PER_SOCKET = 3;

export interface AccentCube {
  x: number;
  y: number;
  z: number;
  hex: string;
}

/**
 * Offsets of the cluster inside the viewer-right socket, relative to the cell (grid x 33,
 * y 28, z 33) just behind the socket opening: spread across the opening so every cube is
 * visible from the front and at the 3/4 pose (a stair deep in the tunnel was hidden
 * by the socket wall). The viewer-left cluster is the exact X mirror.
 */
const SOCKET_CELL = { x: 33, y: 28, z: 33 } as const;
const CLUSTER_OFFSETS: readonly (readonly [number, number, number])[] = [
  [-2, 1, 1],
  [2, 0, 1],
  [0, -2, 0],
];

export function accentCubes(): AccentCube[] {
  const cubes: AccentCube[] = [];
  for (const [dx, dy, dz] of CLUSTER_OFFSETS) {
    const x = SOCKET_CELL.x + dx;
    const y = SOCKET_CELL.y + dy;
    const z = SOCKET_CELL.z + dz;
    cubes.push({ x, y, z, hex: ACCENT_VIEWER_RIGHT_HEX });
    cubes.push({ x: GRID_W - 1 - x, y, z, hex: ACCENT_VIEWER_LEFT_HEX });
  }
  return cubes;
}
