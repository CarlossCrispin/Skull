import { useCallback, useMemo, useState } from 'react';
import { usePrefersReducedMotion } from '../../lib/a11y/usePrefersReducedMotion.js';
import { createFrameMirror } from '../../lib/glass/frameMirror.js';
import { GlassContext } from '../glass/GlassContext.js';
import { SkullHero } from '../skull-hero/SkullHero.jsx';
import { GridOverlay } from './GridOverlay.jsx';
import { useOpening } from './useOpening.js';
import { SECTIONS } from './sections.js';

/**
 * @typedef {object} PageShellProps
 * @property {readonly SectionEntry[]} [sections] - Ordered sections; defaults to the page registry.
 */

/**
 * The single `main` landmark. Order is the decorative grid, the registry sections (poem
 * first in reading order, then the empty assembly range) and the fixed 3D layer last, so its
 * one image description follows the text. Both layers are fixed and the sections sit above
 * them. The page owns the opening: it gates the poem reveal and drives the layer's poster. It
 * also owns the frame mirror and the scene status, which it hands to the poem's glass panel
 * through `GlassContext` so the section registry signature does not change.
 */
export function PageShell({ sections = SECTIONS }) {
  const reducedMotion = usePrefersReducedMotion();
  const opening = useOpening({ reducedMotion });
  const revealGate = opening.phase === 'done';
  const [mirror] = useState(createFrameMirror);
  const [sceneStatus, setSceneStatus] = useState('loading');
  const { reportStatus } = opening;
  const handleStatus = useCallback(
    (status) => {
      setSceneStatus(status);
      reportStatus(status);
    },
    [reportStatus],
  );
  const glass = useMemo(() => ({ mirror, sceneStatus }), [mirror, sceneStatus]);
  return (
    <main>
      <GlassContext.Provider value={glass}>
        <GridOverlay />
        {sections.map(({ id, Component }) => (
          <Component key={id} reducedMotion={reducedMotion} revealGate={revealGate} />
        ))}
        <SkullHero
          reducedMotion={reducedMotion}
          opening={opening}
          sampleOpening={opening.sampleOpening}
          onStatus={handleStatus}
          mirror={mirror}
        />
      </GlassContext.Provider>
    </main>
  );
}
