import { ASSEMBLED_EXIT, ASSEMBLY_STAGGER, LATTICE_FADE_FROM, PROGRESS_SNAP } from './constants.ts';
import { clamp, lerp } from './easing.ts';
import { OPENING_DONE, type OpeningSample } from './opening.ts';
import { scrollProgress } from './scroll.ts';
import { smoothTowards } from './smoothing.ts';

/**
 * Per-cube eased assembly factor in [0, 1]: 0 is fully scattered, 1 is in place.
 * Literal TypeScript reference of the vertex shader expression: each cube moves
 * during a window of length `1 - stagger` that starts at `delay * stagger`.
 */
export function assemblyFactor(p: number, delay: number, stagger: number = ASSEMBLY_STAGGER): number {
  const t = clamp((p - delay * stagger) / (1 - stagger), 0, 1);
  if (t < 0.5) {
    return 4 * t * t * t;
  }
  const f = 2 - 2 * t;
  return 1 - 0.5 * f * f * f;
}

/** Cached document metrics: scroll offsets where assembly starts and ends. */
export interface AssemblyMetrics {
  readonly start: number;
  readonly end: number;
  readonly maxScroll: number;
}

/**
 * Raw assembly target in [0, 1] for a scroll position. The bottom of the page
 * always yields 1 (max-scroll clamp), whatever `end` says.
 */
export function assemblyTarget(scrollY: number, metrics: AssemblyMetrics): number {
  if (scrollY >= metrics.maxScroll - 1) {
    return 1;
  }
  return scrollProgress(scrollY, metrics.start, metrics.end - metrics.start);
}

export type AssemblyPhase = 'opening' | 'scattered' | 'assembling' | 'assembled';

export interface AssemblyState {
  readonly progress: number;
  readonly phase: AssemblyPhase;
  /** Rotation clock in seconds; runs only while assembled, frozen otherwise. */
  readonly rotationT: number;
  readonly initialized: boolean;
}

/** Fully scattered, clock stopped; the first step snaps to the target. */
export function initialAssembly(): AssemblyState {
  return { progress: 0, phase: 'scattered', rotationT: 0, initialized: false };
}

function phaseOf(progress: number, previous: AssemblyPhase): AssemblyPhase {
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
  state: AssemblyState,
  target: number,
  dt: number,
  opening: OpeningSample = OPENING_DONE,
): AssemblyState {
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
  state: AssemblyState,
  target: number,
  opening: OpeningSample = OPENING_DONE,
): boolean {
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
export function latticeOpacity(progress: number): number {
  const x = clamp((progress - LATTICE_FADE_FROM) / (1 - LATTICE_FADE_FROM), 0, 1);
  return x * x * (3 - 2 * x);
}
