import { hudDelay } from '../../lib/motion/hudDelay.js';

/**
 * @typedef {object} GridLinesProps
 * @property {readonly string[]} vertical - Positions of the vertical lines, as CSS percentages of the width (for example `'25%'`).
 * @property {readonly string[]} horizontal - Positions of the horizontal lines, as CSS percentages of the height.
 * @property {boolean} [animated] - Wipes the lines in, then scales the marks in, staggered. Off by default (static grid).
 * @property {number} [delayMs] - Delay before the line stagger starts (the marks follow the lines unless `markDelayMs` is set).
 * @property {number} [markDelayMs] - Delay before the mark stagger starts; the marks then stagger from their own first mark.
 */

/**
 * Decorative full-bleed grid for a HUD frame: 1 px gray-200 lines (the page grid's convention, drawn
 * with borders) and a centered 10 px `+` mark at every intersection. It fills its positioned parent,
 * is aria-hidden and inert. Animated, the lines wipe in first and the marks follow.
 */
export function GridLines({ vertical, horizontal, animated = false, delayMs = 0, markDelayMs }) {
  const entrance = (utility, index, baseMs = delayMs) =>
    animated ? { className: ` ${utility}`, style: hudDelay(index, baseMs) } : { className: '' };
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
          const index = markIndex++;
          const { className, style } =
            markDelayMs === undefined
              ? entrance('hud-scale-in', index)
              : entrance('hud-scale-in', index - lineCount, markDelayMs);
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
