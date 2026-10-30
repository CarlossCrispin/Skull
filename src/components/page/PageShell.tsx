import { useCallback, useMemo, useState } from 'react';
import { usePrefersReducedMotion } from '../../lib/a11y/usePrefersReducedMotion.ts';
import { createFrameMirror } from '../../lib/glass/frameMirror.ts';
import { GlassContext } from '../glass/GlassContext.ts';
import { SkullHero } from '../skull-hero/SkullHero.tsx';
import type { SceneStatus } from '../skull-hero/useSkullScene.ts';
import { GridOverlay } from './GridOverlay.tsx';
import { useOpening } from './useOpening.ts';
import { SECTIONS, type SectionEntry } from './sections.ts';

export interface PageShellProps {
  /** Ordered sections; defaults to the page registry. */
  sections?: readonly SectionEntry[];
}

/**
 * The single `main` landmark. Order is the decorative grid, the registry sections (poem
 * first in reading order, then the empty assembly range) and the fixed 3D layer last, so its
 * one image description follows the text. Both layers are fixed and the sections sit above
 * them. The page owns the opening: it gates the poem reveal and drives the layer's poster. It
 * also owns the frame mirror and the scene status, which it hands to the poem's glass panel
 * through `GlassContext` so the section registry signature does not change.
 */
export function PageShell({ sections = SECTIONS }: PageShellProps) {
  const reducedMotion = usePrefersReducedMotion();
  const opening = useOpening({ reducedMotion });
  const revealGate = opening.phase === 'done';
  const [mirror] = useState(createFrameMirror);
  const [sceneStatus, setSceneStatus] = useState<SceneStatus>('loading');
  const { reportStatus } = opening;
  const handleStatus = useCallback(
    (status: SceneStatus) => {
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
