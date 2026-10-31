import { useRef } from 'react';
import { CLOSE } from '../../content/close.js';
import { FRAME_TOTAL } from '../../content/frames.js';
import { useRevealGroup } from '../../lib/reveal/useRevealGroup.js';
import { useCountdown } from '../../lib/time/useCountdown.js';
import { HUD_GUTTER_CLASSES } from '../../styles/layout.js';
import { Barcode } from '../hud/Barcode.jsx';
import { DataRow } from '../hud/DataRow.jsx';
import { HudCard } from '../hud/HudCard.jsx';

// Whole class tokens only: Tailwind's scanner misses a class glued to a template placeholder.
// Content sits at the bottom so the top of the viewport keeps the reassembled skull visible.
const SECTION_CLASSES = `relative z-10 flex min-h-svh flex-col justify-end py-16 ${HUD_GUTTER_CLASSES}`;
const GRID_CLASSES = 'mx-auto grid w-full max-w-6xl gap-8 md:grid-cols-2 md:items-end md:gap-12';
const TITLE_CLASSES =
  'mt-3 font-display text-[clamp(2.5rem,13vw,4rem)] uppercase leading-display text-ink md:text-[clamp(3rem,6vw,6rem)]';
const LINK_CLASSES =
  'label-mono inline-flex min-h-11 items-center text-ink underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent';

/**
 * Frame 05, the close: the UNESCO row, the date with a live countdown and the signature (barcode,
 * author row, Instagram link). Every block is a reveal item in document order, so the signature
 * card comes last. On mobile the blocks stack; from md the title, heritage and countdown share the
 * left column and the signature sits on the right.
 *
 * @param {import('../page/sections.js').SectionProps} props
 */
export function CloseFrame({ reducedMotion, revealGate }) {
  const sectionRef = useRef(null);
  useRevealGroup(sectionRef, reducedMotion, revealGate);
  const countdown = useCountdown();

  return (
    <section ref={sectionRef} id={CLOSE.id} className={SECTION_CLASSES}>
      <div data-frame-grid="" className={GRID_CLASSES}>
        <div className="flex flex-col gap-8">
          <div data-close-item="title" data-reveal="">
            <p className="label-mono flex items-center gap-3 text-ink">
              <span data-frame-accent="" aria-hidden="true" className="block h-1 w-8 bg-accent" />
              <span data-frame-chip="">{`${CLOSE.number}/${FRAME_TOTAL}`}</span>
            </p>
            <h2 className={TITLE_CLASSES}>{CLOSE.title}</h2>
          </div>
          <div data-close-item="heritage" data-close-heritage="" data-reveal="">
            <HudCard>
              <div className="flex flex-col gap-4">
                <DataRow label={CLOSE.heritage.label} value={CLOSE.heritage.value} wrap />
                <p className="text-body text-ink">{CLOSE.heritage.line}</p>
              </div>
            </HudCard>
          </div>
          <div data-close-item="countdown" data-close-countdown="" data-reveal="">
            <HudCard>
              <div className="flex flex-col gap-4">
                <DataRow label={CLOSE.date.label} value={CLOSE.date.value} wrap />
                <DataRow label={CLOSE.countdownLabel} value={<span aria-live="off">{countdown}</span>} />
              </div>
            </HudCard>
          </div>
        </div>
        <div data-close-item="signature" data-close-signature="" data-reveal="">
          <HudCard>
            <div className="flex flex-col gap-4">
              <Barcode seed={CLOSE.author.barcodeSeed} className="h-10 w-full" />
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
