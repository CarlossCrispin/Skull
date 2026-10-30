import { createContext } from 'react';

/**
 * @typedef {object} GlassContextValue
 * @property {FrameMirror | null} mirror - The channel the scene publishes frames to; null when no page provides one (frost only).
 * @property {SceneStatus} sceneStatus
 */

/**
 * The one seam between the page's 3D layer and the poem's glass panel (design Decision 38):
 * the section registry signature stays unchanged. Without a provider the panel is frost.
 */
export const GlassContext = createContext({ mirror: null, sceneStatus: 'loading' });
