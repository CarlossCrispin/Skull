import { normalizePointer, orientationToLook } from '../lib/motion/look.js';

/**
 * Pointer follow input (the skull turns toward the cursor). Mouse and pen pointers
 * report their position normalized to the viewport; touch pointers are ignored. On
 * touch-only devices DeviceOrientation (gamma, beta) drives the look, but only where
 * it works without a permission prompt: `DeviceOrientationEvent.requestPermission`
 * (iOS) is never called, those devices simply get no follow.
 *
 * Listeners are passive and only report; the scene owns smoothing and rendering.
 * Returns the detach function.
 *
 * @param {(look: Look) => void} onLook
 * @returns {() => void}
 */
export function attachLookInput(onLook) {
  const onPointerMove = (event) => {
    if (event.pointerType === 'touch') {
      return;
    }
    onLook(normalizePointer(event.clientX, event.clientY, window.innerWidth, window.innerHeight));
  };
  const onLeave = () => onLook({ x: 0, y: 0 });
  window.addEventListener('pointermove', onPointerMove, { passive: true });
  document.documentElement.addEventListener('mouseleave', onLeave, { passive: true });

  let onOrientation = null;
  if (usesOrientation()) {
    onOrientation = (event) => {
      if (event.gamma === null || event.gamma === undefined || event.beta === null || event.beta === undefined) {
        return;
      }
      onLook(orientationToLook(event.gamma, event.beta));
    };
    window.addEventListener('deviceorientation', onOrientation, { passive: true });
  }

  return () => {
    window.removeEventListener('pointermove', onPointerMove);
    document.documentElement.removeEventListener('mouseleave', onLeave);
    if (onOrientation !== null) {
      window.removeEventListener('deviceorientation', onOrientation);
    }
  };
}

/** Touch-only device whose orientation events need no permission. */
function usesOrientation() {
  if (typeof DeviceOrientationEvent === 'undefined') {
    return false;
  }
  if (typeof DeviceOrientationEvent.requestPermission === 'function') {
    return false;
  }
  const fine = window.matchMedia?.('(pointer: fine)');
  return fine !== undefined && !fine.matches;
}
