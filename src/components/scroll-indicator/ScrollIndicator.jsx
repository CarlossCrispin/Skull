import { useRef } from 'react';
import { COLORS } from '../../styles/tokens.js';
import { useHideOnFirstScroll } from './useHideOnFirstScroll.js';

// 7x4 pixel chevron pointing down. `#` ink, `.` empty.
const MASK = [
  '#.....#',
  '##...##',
  '.##.##.',
  '..###..',
];

const VOXELS = MASK.flatMap((row, y) => [...row].flatMap((cell, x) => (cell === '#' ? [{ x, y }] : [])));

/**
 * @typedef {object} ScrollIndicatorProps
 * @property {boolean} [reducedMotion] - Static chevron, no bob.
 */

/**
 * Decorative "scroll" cue: icon only, no text, not interactive. The last item of the poem's
 * ordered reveal; it hides for good on the first scroll after it is at least half visible.
 */
export function ScrollIndicator({ reducedMotion = false }) {
  const ref = useRef(null);
  useHideOnFirstScroll(ref);

  return (
    <div ref={ref} aria-hidden="true" data-reveal="indicator" className="flex justify-center">
      <div className={reducedMotion ? undefined : 'indicator-bob'}>
        <svg
          aria-hidden="true"
          focusable="false"
          shapeRendering="crispEdges"
          viewBox={`0 0 ${MASK[0].length} ${MASK.length}`}
          width="28"
          height="16"
          className="block"
        >
          {VOXELS.map(({ x, y }) => (
            <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill={COLORS.ink} />
          ))}
        </svg>
      </div>
    </div>
  );
}
