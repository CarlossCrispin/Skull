import { CalaveraFrame } from '../frames/CalaveraFrame.jsx';
import { CempasuchilFrame } from '../frames/CempasuchilFrame.jsx';
import { CloseFrame } from '../frames/CloseFrame.jsx';
import { OfrendaFrame } from '../frames/OfrendaFrame.jsx';
import { PapelPicadoFrame } from '../frames/PapelPicadoFrame.jsx';
import { PlaceholderFrame } from '../frames/PlaceholderFrame.jsx';
import { AssemblyRange } from './AssemblyRange.jsx';

/**
 * @typedef {object} SectionProps
 * @property {boolean} reducedMotion
 * @property {boolean} revealGate - True once the opening is done; frames stay hidden until then.
 */

/** Ordered page sections. A future section is added by appending one entry. */
export const SECTIONS = [
  { id: 'frame-00', Component: PlaceholderFrame },
  { id: 'frame-01', Component: CempasuchilFrame },
  { id: 'frame-02', Component: OfrendaFrame },
  { id: 'frame-03', Component: PapelPicadoFrame },
  { id: 'frame-04', Component: CalaveraFrame },
  { id: 'assembly-range', Component: AssemblyRange },
  { id: 'frame-05', Component: CloseFrame },
];
