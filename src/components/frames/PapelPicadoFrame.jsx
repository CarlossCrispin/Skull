import { FRAMES } from '../../content/frames.js';
import { HudFrame } from './HudFrame.jsx';

/** Frame 03: papel picado. @param {import('../page/sections.js').SectionProps} props */
export function PapelPicadoFrame(props) {
  return <HudFrame frame={FRAMES[2]} {...props} />;
}
