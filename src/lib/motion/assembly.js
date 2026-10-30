import { ASSEMBLED_EXIT, ASSEMBLY_STAGGER, LATTICE_FADE_FROM, PROGRESS_SNAP } from './constants.js';
import { clamp, lerp } from './easing.js';
import { OPENING_DONE } from './opening.js';
import { scrollProgress } from './scroll.js';
import { smoothTowards } from './smoothing.js';

/**
 * Per-cube eased assembly factor in [0, 1]: 0 is fully scattered, 1 is in place.
 * Literal TypeScript reference of the vertex shader expression: each cube moves
 * during a window of length `1 - stagger` that starts at `delay * stagger`.
 */
export function assemblyFactor(p, delay, stagger = ASSEMBLY_STAGGER) {
  const t = clamp((p - delay * stagger) / (1 - stagger), 0, 1);
  if (t < 0.5) {
    return 4 * t * t * t;
  }
  const f = 2 - 2 * t;
  return 1 - 0.5 * f * f * f;
}

/**
 * Cached document metrics: scroll offsets where assembly starts and ends.
 *
 * @typedef {object} AssemblyMetrics
 * @property {number} start
 * @property {number} end
 * @property {number} maxScroll
 */

/**
 * Raw assembly target in [0, 1] for a scroll position. The bottom of the page
 * always yields 1 (max-scroll clamp), whatever `end` says.
 */
export function assemblyTarget(scrollY, metrics) {
  if (scrollY >= metrics.maxScroll - 1) {
    return 1;
  }
  return scrollProgress(scrollY, metrics.start, metrics.end - metrics.start);
}

/**
 * @typedef {object} AssemblyState
 * @property {number} progress
 * @property {AssemblyPhase} phase
 * @property {number} rotationT - Rotation clock in seconds; runs only while assembled, frozen otherwise.
 * @property {boolean} initialized
 */

/** Fully scattered, clock stopped; the first step snaps to the target. */
export function initialAssembly() {
  return { progress: 0, phase: 'scattered', rotationT: 0, initialized: false };
}

function phaseOf(progress, previous) {
  if (progress >= 1 || (previous === 'assembled' && progress >= ASSEMBLED_EXIT)) {
    return 'assembled';
  }
  return progress <= 0 ? 'scattered' : 'assembling';
}

/**
 * One frame of the assembly state machine. During the opening progress is
 * driven by time: 1 while waiting, zooming and holding, then
 * `lerp(1, target, explode)`, which ends exactly at the live target. Afterwards progress follows `target` through
 * dt-corrected smoothing and snaps once it is within `PROGRESS_SNAP`; the first
 * step takes the target directly. The rotation clock advances only on frames
 * that start and end assembled, so it never runs during the opening.
 */
export function stepAssembly(
  state,
  target,
  dt,
  opening = OPENING_DONE,
) {
  if (opening.phase !== 'done') {
    const progress = lerp(1, target, opening.explode);
    return { progress, phase: 'opening', rotationT: state.rotationT, initialized: true };
  }
  let progress = target;
  if (state.initialized) {
    progress = smoothTowards(state.progress, target, dt);
    if (Math.abs(target - progress) < PROGRESS_SNAP) {
      progress = target;
    }
  }
  const phase = phaseOf(progress, state.phase);
  const rotationT =
    state.phase === 'assembled' && phase === 'assembled' ? state.rotationT + dt : state.rotationT;
  return { progress, phase, rotationT, initialized: true };
}

/**
 * True while another frame is needed: zooming, exploding, assembled (ambient), still
 * converging, or a started zoom still below 1 (an early scroll ends the opening first).
 * Waiting and the hold need none: the scene renders once and idles.
 */
export function needsFrame(
  state,
  target,
  opening = OPENING_DONE,
) {
  if (opening.phase === 'waiting' || opening.phase === 'hold') {
    return false;
  }
  return (
    opening.phase === 'zoom' ||
    opening.phase === 'exploding' ||
    opening.zoom < 1 ||
    state.phase === 'assembled' ||
    state.progress !== target
  );
}

/** Lattice opacity: 0 up to `LATTICE_FADE_FROM`, smoothstep to exactly 1 at progress 1. */
export function latticeOpacity(progress) {
  const x = clamp((progress - LATTICE_FADE_FROM) / (1 - LATTICE_FADE_FROM), 0, 1);
  return x * x * (3 - 2 * x);
}
