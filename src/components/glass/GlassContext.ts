import { createContext } from 'react';
import type { FrameMirror } from '../../lib/glass/frameMirror.ts';
import type { SceneStatus } from '../skull-hero/useSkullScene.ts';

export interface GlassContextValue {
  /** The channel the scene publishes frames to; null when no page provides one (frost only). */
  readonly mirror: FrameMirror | null;
  readonly sceneStatus: SceneStatus;
}

/**
 * The one seam between the page's 3D layer and the poem's glass panel (design Decision 38):
 * the section registry signature stays unchanged. Without a provider the panel is frost.
 */
export const GlassContext = createContext<GlassContextValue>({ mirror: null, sceneStatus: 'loading' });
