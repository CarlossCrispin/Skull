import { Frame00Boot } from '../frames/Frame00Boot.jsx';
import { AssemblyRange } from './AssemblyRange.jsx';

/**
 * @typedef {object} SectionProps
 * @property {boolean} reducedMotion
 * @property {boolean} revealGate - True once the skull zoom has ended (assembled hold) or the opening is skipped; frames stay hidden until then.
 * @property {boolean} skullAssembled - True while the assembled skull is on screen (until the first scroll explodes it); false on the static path.
 */

/** Ordered page sections. A future section is added by appending one entry. */
export const SECTIONS = [
  { id: 'frame-00', Component: Frame00Boot },
  { id: 'assembly-range', Component: AssemblyRange },
];
