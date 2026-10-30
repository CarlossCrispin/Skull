import { useRef } from 'react';
import { COLORS } from '../../styles/tokens.ts';
import { useHideOnFirstScroll } from './useHideOnFirstScroll.ts';

// 7x4 pixel chevron pointing down. `#` ink, `.` empty.
const MASK = [
  '#.....#',
  '##...##',
  '.##.##.',
  '..###..',
] as const;

const VOXELS = MASK.flatMap((row, y) => [...row].flatMap((cell, x) => (cell === '#' ? [{ x, y }] : [])));

export interface ScrollIndicatorProps {
  /** Static chevron, no bob. */
  reducedMotion?: boolean;
}

/**
 * Decorative "scroll" cue: icon only, no text, not interactive. The last item of the poem's
 * ordered reveal; it hides for good on the first scroll after it is at least half visible.
 */
export function ScrollIndicator({ reducedMotion = false }: ScrollIndicatorProps) {
  const ref = useRef<HTMLDivElement>(null);
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
