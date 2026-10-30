import { REVEAL_STEP_MS } from './constants.js';

/**
 * One scheduled reveal: `index` is the item's position in document order.
 *
 * @typedef {object} RevealStep
 * @property {number} index
 * @property {number} delayMs
 */

/**
 * Sequential one-shot reveal plan (design D16). Positions are document order
 * (0 = title, last = signature). When any pending item intersects, it and every
 * pending item before it reveal in this batch, in order, `REVEAL_STEP_MS` apart.
 * The title starts at 0; any batch without the title starts at one step, so a lone
 * stanza is 120 ms and a lone signature is 120 ms (= max(120, highest delay + 120)).
 */
export function planReveal(pendingInOrder, intersecting) {
  let last = -1;
  pendingInOrder.forEach((position, i) => {
    if (intersecting.has(position)) {
      last = i;
    }
  });
  const batch = pendingInOrder.slice(0, last + 1);
  const offset = batch[0] === 0 ? 0 : 1;
  return batch.map((index, i) => ({ index, delayMs: (i + offset) * REVEAL_STEP_MS }));
}
