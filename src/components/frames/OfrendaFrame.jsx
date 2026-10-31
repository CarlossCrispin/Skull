import { FRAMES } from '../../content/frames.js';
import { HudFrame } from './HudFrame.jsx';

/** Frame 02: ofrenda. @param {import('../page/sections.js').SectionProps} props */
export function OfrendaFrame(props) {
  return <HudFrame frame={FRAMES[1]} {...props} />;
}
