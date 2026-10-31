import { useContext, useLayoutEffect, useRef, useState } from 'react';
import { isTouchOnly } from '../../lib/device/touchOnly.js';
import { resolveGlassMode, supportsGlassFilter } from '../../lib/glass/glassWindow.js';
import { GLASS_PANEL_ATTR } from '../../lib/layout/anchors.js';
import { ChamferFrame } from './ChamferFrame.jsx';
import { GlassContext } from './GlassContext.js';
import { GlassWindow } from './GlassWindow.jsx';
import { LiquidGlassFilter } from './LiquidGlassFilter.jsx';
import { useGlassPerfGuard } from './useGlassPerfGuard.js';

/**
 * @typedef {object} GlassPanelProps
 * @property {ReactNode} [children]
 * @property {string} [className] - Extra classes: the section passes the width, centering and inner padding.
 * @property {boolean} [reducedMotion] - Under reduced motion the panel is visible at first paint and never hidden.
 * @property {boolean} [revealGate] - Opening gate (G6): the panel is hidden until it is true, then fades in with the title.
 * @property {boolean} [filterSupported] - Overrides the browser capability check for the refraction reference (tests); default `CSS.supports`.
 * @property {boolean} [touchOnly] - Overrides the touch-only device check (tests); default `isTouchOnly()`.
 */

const HIDDEN_ATTRIBUTE = 'data-glass-hidden';

/**
 * The one cyberpunk glass card that frames the poem (design Decisions 37, 39 and 45). Its shape is
 * a clip-path with the top-left and bottom-right corners cut; its frame is a 1 px grey SVG
 * polygon that follows the cut, with bracket marks on the other two corners (`ChamferFrame`).
 * No radius, no CSS border and no shadow. Frost mode is that frame and a light frost layer
 * under the content.
 * Live mode (scene ready, refraction supported, normal motion, acceptable frame time) adds the
 * fixed glass window and the SVG refraction definition; both are out of flow, so a mode
 * change shifts no layout. The hidden state is an attribute set in a layout effect (no flash
 * before the first paint), so the panel stays visible without JS and under reduced motion.
 * Every added layer is `aria-hidden` decoration; the panel adds no accessible name or text.
 */
export function GlassPanel({
  children,
  className = '',
  reducedMotion = false,
  revealGate = true,
  filterSupported,
  touchOnly,
}) {
  const panelRef = useRef(null);
  const { mirror, sceneStatus } = useContext(GlassContext);
  const [supported] = useState(() => filterSupported ?? supportsGlassFilter());
  const [touch] = useState(() => touchOnly ?? isTouchOnly());
  const isLive = (degraded) =>
    mirror !== null &&
    resolveGlassMode({ reducedMotion, sceneStatus, filterSupported: supported, degraded, touchOnly: touch }) === 'live';
  const degraded = useGlassPerfGuard(isLive(false));
  const live = isLive(degraded);
  const hidden = !reducedMotion && !revealGate;

  useLayoutEffect(() => {
    const panel = panelRef.current;
    if (panel === null) {
      return;
    }
    if (reducedMotion || revealGate) {
      panel.removeAttribute(HIDDEN_ATTRIBUTE);
    } else {
      panel.setAttribute(HIDDEN_ATTRIBUTE, '');
    }
  }, [reducedMotion, revealGate]);

  return (
    <div
      ref={panelRef}
      {...{ [GLASS_PANEL_ATTR]: '' }}
      data-glass-mode={live ? 'live' : 'frost'}
      className={`glass-panel relative ${className}`}
    >
      {live && mirror !== null ? (
        <>
          <LiquidGlassFilter />
          <GlassWindow panelRef={panelRef} mirror={mirror} suspended={hidden} />
        </>
      ) : null}
      <div aria-hidden="true" className="glass-frost absolute inset-0" />
      <ChamferFrame />
      <div className="relative">{children}</div>
    </div>
  );
}
