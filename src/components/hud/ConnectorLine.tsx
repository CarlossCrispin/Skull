import { HUD_STAGGER_MS, hudDelay } from '../../lib/motion/hudDelay.ts';

/** A point in percent of the positioned parent (0 to 100 on each axis). */
export interface ConnectorPoint {
  x: number;
  y: number;
}

export interface ConnectorLineProps {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  /** Wipes the line in from its left end (the `hud-draw-line` entrance). Static by default. */
  draw?: boolean;
  /** Delay before the wipe starts. */
  delayMs?: number;
}

const pct = (value: number): string => `${value}%`;

/**
 * One straight connector from (x1, y1) to (x2, y2), in percent of the positioned parent. The svg
 * is full-bleed and the stroke non-scaling, so the line stays 1 px at any size. Decoration only.
 */
export function ConnectorLine({ x1, y1, x2, y2, draw = false, delayMs = 0 }: ConnectorLineProps) {
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

export interface ElbowConnectorProps {
  from: ConnectorPoint;
  to: ConnectorPoint;
  /** X (percent) where the horizontal run turns into the diagonal. */
  elbowX: number;
  /** Draws the run first and the diagonal right after it. */
  draw?: boolean;
  delayMs?: number;
}

/** The elbow pattern: a horizontal run from `from` to `elbowX`, then a diagonal into `to`. */
export function ElbowConnector({ from, to, elbowX, draw = false, delayMs = 0 }: ElbowConnectorProps) {
  return (
    <>
      <ConnectorLine x1={from.x} y1={from.y} x2={elbowX} y2={from.y} draw={draw} delayMs={delayMs} />
      <ConnectorLine x1={elbowX} y1={from.y} x2={to.x} y2={to.y} draw={draw} delayMs={delayMs + 2 * HUD_STAGGER_MS} />
    </>
  );
}
