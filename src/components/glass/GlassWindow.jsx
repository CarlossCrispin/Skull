import { useRef } from 'react';
import { useGlassWindow } from './useGlassWindow.js';

/**
 * @typedef {object} GlassWindowProps
 * @property {RefObject<HTMLElement | null>} panelRef - The glass panel this window is clipped to.
 * @property {FrameMirror} mirror
 * @property {boolean} suspended - True while the panel is hidden by the opening gate; frames are skipped.
 */

/**
 * The fixed live-glass window (design Decisions 37 and 43): a viewport-locked clip container sized
 * to the panel's extent, holding a copy of the 3D layer that is the viewport plus an overscan margin on every side. The SVG refraction runs on
 * the copy, not on the clip, so its edge bands fall in the overscan, outside the viewport.
 * Pure decoration: `aria-hidden`, no pointer events, no text.
 */
export function GlassWindow({ panelRef, mirror, suspended }) {
  const windowRef = useRef(null);
  const canvasRef = useRef(null);
  useGlassWindow({ panelRef, windowRef, canvasRef, mirror, suspended });
  return (
    <div ref={windowRef} aria-hidden="true" className="glass-window">
      <canvas ref={canvasRef} className="glass-copy" />
    </div>
  );
}
