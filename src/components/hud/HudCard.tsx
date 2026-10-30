import type { ReactNode } from 'react';
import { ChamferFrame } from '../glass/ChamferFrame.tsx';

export interface HudCardProps {
  children?: ReactNode;
  /** Optional badge sitting on the card's top edge. */
  label?: string;
  /** Extra classes: the frame passes the width and position. */
  className?: string;
}

/**
 * HUD card: the shared chamfered grey frame around uniformly padded content, with an optional
 * square accent badge above it. No radius, border or shadow; the frame is the only outline.
 */
export function HudCard({ children, label, className = '' }: HudCardProps) {
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
