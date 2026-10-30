export interface GridLinesProps {
  /** Positions of the vertical lines, as CSS percentages of the width (for example `'25%'`). */
  vertical: readonly string[];
  /** Positions of the horizontal lines, as CSS percentages of the height. */
  horizontal: readonly string[];
}

/**
 * Decorative full-bleed grid for a HUD frame: 1 px gray-200 lines (the page grid's convention, drawn
 * with borders) and a centered 10 px `+` mark at every intersection. It fills its positioned parent,
 * is aria-hidden and inert.
 */
export function GridLines({ vertical, horizontal }: GridLinesProps) {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0">
      {vertical.map((left) => (
        <span key={`v-${left}`} data-grid="line-v" style={{ left }} className="absolute inset-y-0 border-l border-gray-200" />
      ))}
      {horizontal.map((top) => (
        <span key={`h-${top}`} data-grid="line-h" style={{ top }} className="absolute inset-x-0 border-t border-gray-200" />
      ))}
      {vertical.flatMap((left) =>
        horizontal.map((top) => (
          <span
            key={`m-${left}-${top}`}
            data-grid="mark"
            style={{ left, top }}
            className="absolute size-2.5 -translate-x-1/2 -translate-y-1/2"
          >
            <span className="absolute left-0 top-1/2 w-full border-t border-gray-200" />
            <span className="absolute left-1/2 top-0 h-full border-l border-gray-200" />
          </span>
        )),
      )}
    </div>
  );
}
