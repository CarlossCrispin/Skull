import { useRef } from 'react';
import { FRAME_TOTAL } from '../../content/frames.js';
import { useRevealGroup } from '../../lib/reveal/useRevealGroup.js';
import { HUD_GUTTER_CLASSES } from '../../styles/layout.js';
import { DataRow } from '../hud/DataRow.jsx';
import { HudCard } from '../hud/HudCard.jsx';

// Whole class tokens only: Tailwind's scanner misses a class glued to a template placeholder.
const SECTION_CLASSES = `relative z-10 flex min-h-svh items-center py-16 ${HUD_GUTTER_CLASSES}`;
const GRID_CLASSES = 'mx-auto grid w-full max-w-6xl gap-8 md:grid-cols-2 md:items-center md:gap-12';
const TITLE_CLASSES =
  'mt-3 font-display text-[clamp(2.5rem,13vw,4rem)] uppercase leading-display text-ink md:text-[clamp(3rem,6vw,6rem)]';
// Odd frames put the card on the right, even frames on the left; below md the order is the DOM order.
const SIDE = {
  odd: { title: 'md:order-1', card: 'md:order-2' },
  even: { title: 'md:order-2', card: 'md:order-1' },
};
const ACCENT_BAR = { accent: 'bg-accent', signal: 'bg-signal' };

/**
 * One HUD frame (01 to 04): index chip and title on one side, a HudCard with the label row, the
 * body lines and the data rows on the other, side by side from md and stacked on mobile. The title
 * block and the card are reveal items: they rise in as they scroll into view; under reduced motion
 * the hidden state is never armed. The copy is always in the DOM.
 *
 * @param {import('../page/sections.js').SectionProps & { frame: import('../../content/frames.js').FrameContent }} props
 */
export function HudFrame({ frame, reducedMotion, revealGate }) {
  const sectionRef = useRef(null);
  useRevealGroup(sectionRef, reducedMotion, revealGate);
  const side = SIDE[Number(frame.number) % 2 === 1 ? 'odd' : 'even'];

  return (
    <section ref={sectionRef} id={frame.id} className={SECTION_CLASSES}>
      <div data-frame-grid="" className={GRID_CLASSES}>
        <div data-frame-title="" data-reveal="" className={side.title}>
          <p className="label-mono flex items-center gap-3 text-ink">
            <span data-frame-accent="" aria-hidden="true" className={`block h-1 w-8 ${ACCENT_BAR[frame.tone]}`} />
            <span data-frame-chip="">{`${frame.number}/${FRAME_TOTAL}`}</span>
          </p>
          <h2 className={TITLE_CLASSES}>{frame.title}</h2>
        </div>
        <div data-frame-card="" data-reveal="" className={side.card}>
          <HudCard>
            <div className="flex flex-col gap-4">
            <DataRow label={frame.header.label} value={frame.header.value} wrap />
            {frame.lines.map((line) => (
              <p key={line} className="text-body text-ink">
                {line}
              </p>
            ))}
            {(frame.rows ?? []).map((row) => (
              <DataRow key={row.label} label={row.label} value={row.value} wrap />
            ))}
            </div>
          </HudCard>
        </div>
      </div>
    </section>
  );
}
