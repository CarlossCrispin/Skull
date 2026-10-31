import { useRef } from 'react';
import { CLOSE } from '../../content/close.js';
import { useRevealGroup } from '../../lib/reveal/useRevealGroup.js';
import { HUD_GUTTER_CLASSES } from '../../styles/layout.js';
import { DataRow } from '../hud/DataRow.jsx';
import { HudCard } from '../hud/HudCard.jsx';

// Whole class tokens only: Tailwind's scanner misses a class glued to a template placeholder.
// Content sits at the bottom so the top of the viewport keeps the reassembled skull visible.
const SECTION_CLASSES = `relative z-10 flex min-h-svh flex-col justify-end py-16 ${HUD_GUTTER_CLASSES}`;
const CARD_SLOT_CLASSES = 'mx-auto w-full max-w-6xl md:flex md:justify-end';
const LINK_CLASSES =
  'label-mono inline-flex min-h-11 items-center text-ink underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent';

/**
 * Frame 05, the close: one HUD card with the author row and the Instagram link (user decision,
 * 2026-10-31). The heading is visually hidden. The card is the only reveal item; under reduced
 * motion it shows at once.
 *
 * @param {import('../page/sections.js').SectionProps} props
 */
export function CloseFrame({ reducedMotion, revealGate }) {
  const sectionRef = useRef(null);
  useRevealGroup(sectionRef, reducedMotion, revealGate);

  return (
    <section ref={sectionRef} id={CLOSE.id} className={SECTION_CLASSES}>
      <h2 className="sr-only">{CLOSE.srTitle}</h2>
      <div className={CARD_SLOT_CLASSES}>
        <div data-close-item="signature" data-close-signature="" data-reveal="" className="md:w-96">
          <HudCard>
            <div className="flex flex-col gap-4">
              <DataRow label={CLOSE.author.label} value={CLOSE.author.value} wrap />
              <a
                href={CLOSE.link.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={CLOSE.link.ariaLabel}
                className={LINK_CLASSES}
              >
                {CLOSE.link.text}
              </a>
            </div>
          </HudCard>
        </div>
      </div>
    </section>
  );
}
