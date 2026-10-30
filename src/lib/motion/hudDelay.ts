import type { CSSProperties } from 'react';

/** Gap between consecutive HUD entrance steps (labels and connectors come before the boxes they point to). */
export const HUD_STAGGER_MS = 80;

/** Inline `animation-delay` for the `index`-th step of a staggered HUD entrance, after `baseMs`. */
export function hudDelay(index: number, baseMs = 0): CSSProperties {
  return { animationDelay: `${baseMs + index * HUD_STAGGER_MS}ms` };
}
