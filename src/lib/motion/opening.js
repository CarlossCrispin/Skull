import {
  OPENING_EXPLODE_S,
  OPENING_HOLD_S,
  OPENING_MAX_WAIT_S,
  OPENING_ZOOM_S,
} from './constants.js';
import { clamp, easeOutCubic } from './easing.js';

const ZOOM_MS = OPENING_ZOOM_S * 1000;
const HOLD_MS = OPENING_HOLD_S * 1000;
const EXPLODE_MS = OPENING_EXPLODE_S * 1000;
const MAX_WAIT_MS = OPENING_MAX_WAIT_S * 1000;

/**
 * Pure opening state; every transition takes the wall-clock timestamp in ms.
 *
 * @typedef {object} OpeningState
 * @property {OpeningPhase} phase
 * @property {number} mountMs
 * @property {number | null} zoomStartMs - Timestamp of the first presented scene frame (the zoom start), once known.
 * @property {number | null} explodeStartMs
 * @property {boolean} skipped - True when the opening ended without an explosion.
 */

/**
 * What the scene consumes: phase, zoom and explosion amounts, both in [0, 1].
 *
 * @typedef {object} OpeningSample
 * @property {OpeningPhase} phase
 * @property {number} zoom
 * @property {number} explode
 */

/** The finished opening: the default for every consumer, so the page stays unchanged. */
export const OPENING_DONE = { phase: 'done', zoom: 1, explode: 1 };

/** Starts waiting at `nowMs`; without animation (reduced motion) it is already done. */
export function openingInitial(nowMs, animate) {
  return {
    phase: animate ? 'waiting' : 'done',
    mountMs: nowMs,
    zoomStartMs: null,
    explodeStartMs: null,
    skipped: false,
  };
}

/** Applies every transition whose time is at or before `nowMs`. */
export function openingAdvance(state, nowMs) {
  let next = state;
  if (next.phase === 'waiting' && nowMs >= next.mountMs + MAX_WAIT_MS) {
    return { ...next, phase: 'done', skipped: true };
  }
  const zoomStart = next.zoomStartMs ?? nowMs;
  if (next.phase === 'zoom' && nowMs >= zoomStart + ZOOM_MS) {
    next = { ...next, phase: 'hold' };
  }
  if (next.phase === 'hold' && nowMs >= zoomStart + ZOOM_MS + HOLD_MS) {
    next = { ...next, phase: 'exploding', explodeStartMs: zoomStart + ZOOM_MS + HOLD_MS };
  }
  if (next.phase === 'exploding' && nowMs >= (next.explodeStartMs ?? nowMs) + EXPLODE_MS) {
    next = { ...next, phase: 'done' };
  }
  return next;
}

/** Records the first presented frame and starts the zoom; ignored once waiting is over. */
export function openingSceneReady(state, nowMs) {
  const current = openingAdvance(state, nowMs);
  return current.phase === 'waiting' ? { ...current, phase: 'zoom', zoomStartMs: nowMs } : current;
}

/** The scene failed or was lost: anything before the explosion is skipped, a running one just ends. */
export function openingSceneFailed(state) {
  if (state.phase === 'waiting' || state.phase === 'zoom' || state.phase === 'hold') {
    return { ...state, phase: 'done', skipped: true };
  }
  return state.phase === 'exploding' ? { ...state, phase: 'done' } : state;
}

/** A scroll while waiting skips; during the zoom or hold it explodes now (the zoom keeps running). */
export function openingScroll(state, nowMs) {
  const current = openingAdvance(state, nowMs);
  if (current.phase === 'waiting') {
    return { ...current, phase: 'done', skipped: true };
  }
  if (current.phase === 'zoom' || current.phase === 'hold') {
    return { ...current, phase: 'exploding', explodeStartMs: nowMs };
  }
  return current;
}

/** Timestamp of the next transition, or null once done. */
export function openingDeadline(state) {
  const zoomStart = state.zoomStartMs ?? state.mountMs;
  switch (state.phase) {
    case 'waiting':
      return state.mountMs + MAX_WAIT_MS;
    case 'zoom':
      return zoomStart + ZOOM_MS;
    case 'hold':
      return zoomStart + ZOOM_MS + HOLD_MS;
    case 'exploding':
      return (state.explodeStartMs ?? state.mountMs) + EXPLODE_MS;
    case 'done':
      return null;
  }
}

/**
 * Scene inputs at `nowMs`. The zoom is purely time-based once started (also while
 * exploding and done), so an early scroll never freezes or snaps it.
 */
export function openingSample(state, nowMs) {
  const current = openingAdvance(state, nowMs);
  const zoom =
    current.zoomStartMs === null
      ? current.phase === 'done'
        ? 1
        : 0
      : easeOutCubic(clamp((nowMs - current.zoomStartMs) / ZOOM_MS, 0, 1));
  const explode =
    current.phase === 'exploding'
      ? easeOutCubic(clamp((nowMs - (current.explodeStartMs ?? nowMs)) / EXPLODE_MS, 0, 1))
      : current.phase === 'done'
        ? 1
        : 0;
  return { phase: current.phase, zoom, explode };
}
