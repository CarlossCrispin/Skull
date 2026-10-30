
export const PLACEHOLDER_FRAME_ID = 'frame-00';

/**
 * Neutral first section of the skull-only baseline: one viewport of empty scroll above the
 * assembly range, with the page h1 kept visually hidden. HUD frames replace it in later tasks.
 */
export function PlaceholderFrame(_props) {
  return (
    <section id={PLACEHOLDER_FRAME_ID} className="min-h-svh">
      <h1 className="sr-only">Protocolo Ofrenda</h1>
    </section>
  );
}
