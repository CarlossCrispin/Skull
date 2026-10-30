import { COLORS } from '../../styles/tokens.js';

// 8x8 voxel skull. `#` ink, `a` accent (eye sockets), `.` empty.
const MASK = [
  '.######.',
  '########',
  '#aa##aa#',
  '#aa##aa#',
  '########',
  '.##..##.',
  '.######.',
  '.#.##.#.',
];

const FILL = { '#': COLORS.ink, a: COLORS.accent };

const VOXELS = MASK.flatMap((row, y) =>
  [...row].flatMap((cell, x) => (cell === '#' || cell === 'a' ? [{ x, y, fill: FILL[cell] }] : [])),
);

/** Decorative voxel skull, about 1em tall; palette tokens only, flat, no filters. */
export function VoxelIcon() {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      shapeRendering="crispEdges"
      viewBox={`0 0 ${MASK[0].length} ${MASK.length}`}
      width="1em"
      height="1em"
      className="inline-block align-[-0.1em]"
    >
      {VOXELS.map(({ x, y, fill }) => (
        <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill={fill} />
      ))}
    </svg>
  );
}
