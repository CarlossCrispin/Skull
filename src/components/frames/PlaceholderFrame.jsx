export const PLACEHOLDER_FRAME_ID = 'frame-00';

/**
 * Neutral first section: one viewport of empty scroll above the assembly range, with the page h1
 * kept visually hidden. Frame 00 carries no visible text (user decision, 2026-10-30).
 *
 * @param {import('../page/sections.js').SectionProps} _props
 */
export function PlaceholderFrame(_props) {
  return (
    <section id={PLACEHOLDER_FRAME_ID} className="min-h-svh">
      <h1 className="sr-only">Protocolo Ofrenda</h1>
    </section>
  );
}
