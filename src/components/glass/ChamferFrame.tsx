import { useLayoutEffect, useRef, useState } from 'react';
import { chamferBracketPoints, chamferFramePoints } from '../../lib/glass/chamfer.ts';
import { GLASS_BRACKET_ARM_PX, GLASS_BRACKET_INSET_PX, GLASS_CHAMFER_PX } from '../../lib/glass/constants.ts';

/** Half of the 1 px stroke: the polygon is drawn this far inside so the card clip does not crop it. */
const HALF_STROKE_PX = 0.5;

/**
 * The card's frame (design Decision 45): a 1 px grey polygon that follows the chamfered top-left
 * and bottom-right corners, plus a bracket mark on the top-right and bottom-left corners. The
 * view box is the measured card size and the stroke is non-scaling, so the diagonals stay 45
 * degrees at any size and the line stays 1 px. Pure decoration: aria-hidden, inert, no text.
 */
export function ChamferFrame() {
  const svgRef = useRef<SVGSVGElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useLayoutEffect(() => {
    const svg = svgRef.current;
    if (svg === null) {
      return;
    }
    const rect = svg.getBoundingClientRect();
    setSize({ width: rect.width, height: rect.height });
    if (typeof ResizeObserver === 'undefined') {
      return;
    }
    const observer = new ResizeObserver(([entry]) => {
      if (entry !== undefined) {
        setSize({ width: entry.contentRect.width, height: entry.contentRect.height });
      }
    });
    observer.observe(svg);
    return () => observer.disconnect();
  }, []);

  const { width, height } = size;
  return (
    <svg
      ref={svgRef}
      aria-hidden="true"
      data-glass-frame=""
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className="pointer-events-none absolute inset-0 h-full w-full"
    >
      <polygon
        points={chamferFramePoints(width, height, GLASS_CHAMFER_PX, HALF_STROKE_PX)}
        fill="none"
        strokeWidth="1"
        vectorEffect="non-scaling-stroke"
        className="stroke-gray-400"
      />
      {chamferBracketPoints(width, height, GLASS_BRACKET_ARM_PX, GLASS_BRACKET_INSET_PX).map((points) => (
        <polyline
          key={points}
          points={points}
          fill="none"
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
          className="stroke-gray-400"
        />
      ))}
    </svg>
  );
}
