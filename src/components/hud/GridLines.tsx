import type { CSSProperties } from 'react';
import { hudDelay } from '../../lib/motion/hudDelay.ts';

export interface GridLinesProps {
  /** Positions of the vertical lines, as CSS percentages of the width (for example `'25%'`). */
  vertical: readonly string[];
  /** Positions of the horizontal lines, as CSS percentages of the height. */
  horizontal: readonly string[];
  /** Wipes the lines in, then scales the marks in, staggered. Off by default (static grid). */
  animated?: boolean;
}

interface Entrance {
  className: string;
  style?: CSSProperties;
}

/**
 * Decorative full-bleed grid for a HUD frame: 1 px gray-200 lines (the page grid's convention, drawn
 * with borders) and a centered 10 px `+` mark at every intersection. It fills its positioned parent,
 * is aria-hidden and inert. Animated, the lines wipe in first and the marks follow.
 */
export function GridLines({ vertical, horizontal, animated = false }: GridLinesProps) {
  const entrance = (utility: string, index: number): Entrance =>
    animated ? { className: ` ${utility}`, style: hudDelay(index) } : { className: '' };
  const lineCount = vertical.length + horizontal.length;
  let markIndex = lineCount;
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0">
      {vertical.map((left, i) => {
        const { className, style } = entrance('hud-grid-v', i);
        return (
          <span
            key={`v-${left}`}
            data-grid="line-v"
            style={{ left, ...style }}
            className={`absolute inset-y-0 border-l border-gray-200${className}`}
          />
        );
      })}
      {horizontal.map((top, i) => {
        const { className, style } = entrance('hud-grid-h', vertical.length + i);
        return (
          <span
            key={`h-${top}`}
            data-grid="line-h"
            style={{ top, ...style }}
            className={`absolute inset-x-0 border-t border-gray-200${className}`}
          />
        );
      })}
      {vertical.flatMap((left) =>
        horizontal.map((top) => {
          const { className, style } = entrance('hud-scale-in', markIndex++);
          return (
            <span
              key={`m-${left}-${top}`}
              data-grid="mark"
              style={{ left, top, ...style }}
              className={`absolute size-2.5 -translate-x-1/2 -translate-y-1/2${className}`}
            >
              <span className="absolute left-0 top-1/2 w-full border-t border-gray-200" />
              <span className="absolute left-1/2 top-0 h-full border-l border-gray-200" />
            </span>
          );
        }),
      )}
    </div>
  );
}
