import { hudDelay } from './hudDelay.js';

/**
 * @typedef {object} HudGate
 * @property {boolean} revealGate - True once the skull opening is done.
 * @property {boolean} reducedMotion
 */

/**
 * Class and inline style for one gated HUD entrance. Before the gate the element is `invisible`
 * (hidden, still in layout, out of the tab order) so nothing shifts when it opens; after it the
 * `hud-*` utility plays once after `delayMs`. Under reduced motion it is simply visible.
 */
export function hudEntrance(utility, { revealGate, reducedMotion }, delayMs = 0) {
  if (reducedMotion) return { className: '', style: undefined };
  if (!revealGate) return { className: 'invisible', style: undefined };
  return { className: utility, style: hudDelay(0, delayMs) };
}
