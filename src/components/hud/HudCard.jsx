import { ChamferFrame } from '../glass/ChamferFrame.jsx';

/**
 * @typedef {object} HudCardProps
 * @property {ReactNode} [children]
 * @property {string} [label] - Optional badge sitting on the card's top edge.
 * @property {string} [className] - Extra classes: the frame passes the width and position.
 */

/**
 * HUD card: the shared chamfered grey frame around uniformly padded content, with an optional
 * square accent badge above it. No radius, border or shadow; the frame is the only outline.
 */
export function HudCard({ children, label, className = '' }) {
  return (
    <div className={`relative ${className}`}>
      {label === undefined ? null : (
        <span data-hud-badge="" className="label-mono absolute bottom-full left-0 bg-accent px-2 py-1 text-bg">
          {label}
        </span>
      )}
      <ChamferFrame />
      <div className="relative p-5">{children}</div>
    </div>
  );
}
