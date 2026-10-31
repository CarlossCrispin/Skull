import { HUD_STAGGER_MS, hudDelay } from '../../lib/motion/hudDelay.js';

/**
 * A point in percent of the positioned parent (0 to 100 on each axis).
 *
 * @typedef {object} ConnectorPoint
 * @property {number} x
 * @property {number} y
 */

/**
 * @typedef {object} ConnectorLineProps
 * @property {number} x1
 * @property {number} y1
 * @property {number} x2
 * @property {number} y2
 * @property {boolean} [draw] - Wipes the line in from its left end (the `hud-draw-line` entrance). Static by default.
 * @property {number} [delayMs] - Delay before the wipe starts.
 */

const pct = (value) => `${value}%`;

/**
 * One straight connector from (x1, y1) to (x2, y2), in percent of the positioned parent. The svg
 * is full-bleed and the stroke non-scaling, so the line stays 1 px at any size. Decoration only.
 */
export function ConnectorLine({ x1, y1, x2, y2, draw = false, delayMs = 0 }) {
  return (
    <svg
      aria-hidden="true"
      style={draw ? hudDelay(0, delayMs) : undefined}
      className={`pointer-events-none absolute inset-0 h-full w-full text-gray-400${draw ? ' hud-draw-line' : ''}`}
    >
      <line
        x1={pct(x1)}
        y1={pct(y1)}
        x2={pct(x2)}
        y2={pct(y2)}
        stroke="currentColor"
        strokeWidth="1"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

/**
 * @typedef {object} ElbowConnectorProps
 * @property {ConnectorPoint} from
 * @property {ConnectorPoint} to
 * @property {number} elbowX - X (percent) where the horizontal run turns into the diagonal.
 * @property {boolean} [draw] - Draws the run first and the diagonal right after it.
 * @property {number} [delayMs]
 */

/** The elbow pattern: a horizontal run from `from` to `elbowX`, then a diagonal into `to`. */
export function ElbowConnector({ from, to, elbowX, draw = false, delayMs = 0 }) {
  return (
    <>
      <ConnectorLine x1={from.x} y1={from.y} x2={elbowX} y2={from.y} draw={draw} delayMs={delayMs} />
      <ConnectorLine x1={elbowX} y1={from.y} x2={to.x} y2={to.y} draw={draw} delayMs={delayMs + 2 * HUD_STAGGER_MS} />
    </>
  );
}
