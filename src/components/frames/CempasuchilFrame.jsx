import { FRAMES } from '../../content/frames.js';
import { HudFrame } from './HudFrame.jsx';

/** Frame 01: cempasúchil. @param {import('../page/sections.js').SectionProps} props */
export function CempasuchilFrame(props) {
  return <HudFrame frame={FRAMES[0]} {...props} />;
}
