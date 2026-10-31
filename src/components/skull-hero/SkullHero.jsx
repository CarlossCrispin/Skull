import { useCallback, useEffect, useRef, useState } from 'react';
import { SKULL_ALT } from '../../content/a11y.js';
import { useSceneDriver } from './useSceneDriver.js';
import { useSkullScene } from './useSkullScene.js';

/**
 * @typedef {object} SkullHeroProps
 * @property {boolean} [reducedMotion] - Instant poster to canvas swap instead of the 500 ms cross-fade.
 * @property {{ phase: OpeningPhase }} [opening] - The opening phase; defaults to done.
 * @property {(nowMs: number) => OpeningSample} [sampleOpening] - Maps the wall clock to the opening sample for the scene; defaults to the finished opening.
 * @property {(status: SceneStatus) => void} [onStatus] - Called with the scene status on every change (including the initial one).
 * @property {FrameMirror} [mirror] - Frame channel for the glass panel: receives every rendered frame and the scene's present request.
 */

const POSTER_CLASS = {
  full: 'skull-full',
  backdrop: 'skull-backdrop',
  hidden: 'invisible',
};

/**
 * The fixed full-viewport 3D layer. The lazily loaded three scene mounts into the canvas
 * host and fades in once its first frame is presented. The poster is never shown on the
 * normal path (design Decision 34): the zoom entrance needs the live scene, and the first
 * frame is empty. Two exceptions keep the page legible: on the static path (reduced motion,
 * lost, failed) it is a faint backdrop behind the poem that becomes full in the assembly
 * range, switching instantly; and when the opening was skipped while the scene is still
 * loading (never ready within the maximum wait, G5) it is the faint backdrop until the
 * canvas arrives. Otherwise it stays hidden in the DOM. One image-role node carries the
 * accessible name; everything inside is hidden from assistive technology.
 */
export function SkullHero({
  reducedMotion = false,
  opening = { phase: 'done' },
  sampleOpening,
  onStatus,
  mirror,
}) {
  const hostRef = useRef(null);
  const [scene, setScene] = useState(null);
  const { readScrollFrame, inAssemblyRange } = useSceneDriver(hostRef, scene, { sampleOpening });
  const handleScene = useCallback(
    (live) => {
      setScene(live);
      mirror?.setRequester(live === null ? null : () => live.requestPresent());
    },
    [mirror],
  );
  const status = useSkullScene({
    hostRef,
    reducedMotion,
    readScrollFrame,
    onScene: handleScene,
    onPresent: mirror?.publish,
  });

  useEffect(() => {
    onStatus?.(status);
  }, [status, onStatus]);

  const phase = opening.phase;
  useEffect(() => {
    scene?.invalidate();
  }, [phase, scene]);

  const canvasVisible = !reducedMotion && status === 'ready';
  const staticPath = reducedMotion || status === 'lost' || status === 'failed';
  let role = phase === 'done' && status === 'loading' ? 'backdrop' : 'hidden';
  if (staticPath) {
    role = inAssemblyRange ? 'full' : 'backdrop';
  }
  const backdropVisible = role !== 'hidden';
  const fadeClass = reducedMotion ? '' : 'skull-fade';

  return (
    <div
      role="img"
      aria-label={SKULL_ALT}
      data-skull-state={status}
      data-fade={reducedMotion ? 'instant' : 'fade'}
      className="skull-layer"
    >
      <img
        src="/poster.png"
        alt=""
        aria-hidden="true"
        draggable={false}
        data-visible={backdropVisible}
        className={`skull-poster-box absolute left-1/2 top-1/2 max-w-none -translate-x-1/2 -translate-y-1/2 select-none ${
          POSTER_CLASS[role]
        }`}
      />
      <div
        ref={hostRef}
        aria-hidden="true"
        data-skull-host=""
        data-visible={canvasVisible}
        className={`absolute inset-0 [&>canvas]:block [&>canvas]:h-full [&>canvas]:w-full ${fadeClass} ${
          canvasVisible ? 'opacity-100' : 'opacity-0'
        }`}
      />
    </div>
  );
}
