import { ScrollIndicator } from '../scroll-indicator/ScrollIndicator.jsx';

export const PLACEHOLDER_FRAME_ID = 'frame-00';

// Whole class tokens only: Tailwind's scanner misses a class glued to a template placeholder.
const CUE_SLOT_CLASSES = 'absolute inset-x-0 bottom-8';

/**
 * Neutral first section: one viewport of empty scroll above the assembly range, with the page h1
 * kept visually hidden. Frame 00 carries no visible text (user decision, 2026-10-30); its only
 * visible item is the icon-only scroll cue at the bottom centre. The cue waits for the opening
 * gate (after the explosion) and fades in; under reduced motion it shows at once without the bob.
 *
 * @param {import('../page/sections.js').SectionProps} props
 */
export function PlaceholderFrame({ reducedMotion, revealGate }) {
  const showCue = reducedMotion || revealGate;

  return (
    <section id={PLACEHOLDER_FRAME_ID} className="relative z-10 min-h-svh">
      <h1 className="sr-only">Protocolo Ofrenda</h1>
      {showCue ? (
        <div className={reducedMotion ? CUE_SLOT_CLASSES : `${CUE_SLOT_CLASSES} hud-fade-up`}>
          <ScrollIndicator reducedMotion={reducedMotion} />
        </div>
      ) : null}
    </section>
  );
}
