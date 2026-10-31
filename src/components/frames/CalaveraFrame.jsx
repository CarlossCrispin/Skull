import { FRAMES } from '../../content/frames.js';
import { HudFrame } from './HudFrame.jsx';

/** Frame 04: calavera. @param {import('../page/sections.js').SectionProps} props */
export function CalaveraFrame(props) {
  return <HudFrame frame={FRAMES[3]} {...props} />;
}
