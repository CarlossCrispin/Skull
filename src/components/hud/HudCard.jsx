import { ChamferFrame } from '../glass/ChamferFrame.jsx';

/**
 * @typedef {object} HudCardProps
 * @property {ReactNode} [children]
 * @property {string} [label] - Optional badge sitting on the card's top edge.
 * @property {'accent' | 'signal'} [tone] - Badge color token: `accent` (default, bg text on accent) or `signal` (ink text on signal).
 * @property {string} [padding] - Content padding class; defaults to `p-5`.
 * @property {string} [className] - Extra classes: the frame passes the width and position.
 */

const BADGE_TONE = {
  accent: 'bg-accent text-bg',
  signal: 'bg-signal text-ink',
};

/**
 * HUD card: the shared chamfered grey frame around uniformly padded content, with an optional
 * square accent badge above it. No radius, border or shadow; the frame is the only outline.
 */
export function HudCard({ children, label, tone = 'accent', padding = 'p-5', className = '' }) {
  return (
    <div className={`relative ${className}`}>
      {label === undefined ? null : (
        <span data-hud-badge="" className={`label-mono absolute bottom-full left-0 px-2 py-1 ${BADGE_TONE[tone]}`}>
          {label}
        </span>
      )}
      <ChamferFrame />
      <div className={`relative ${padding}`}>{children}</div>
    </div>
  );
}
