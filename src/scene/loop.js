import { MAX_DT_S } from '../lib/motion/constants.js';

/**
 * @typedef {object} FrameLoopDeps
 * @property {FrameScheduler} scheduler
 * @property {() => number} now - Wall clock in milliseconds; used only to re-anchor the frame clock on resume.
 * @property {(t: number, dt: number) => boolean} onFrame - Frame body: `t` is the active animation time in seconds, `dt` the clamped step. Returns `true` when another frame is needed; `false` idles the loop until `invalidate()`.
 */

/**
 * Pause-aware, demand-driven frame loop (design D8, D10). A frame is requested
 * only while the pause-reason set is empty and the last frame asked for more. The animation clock accumulates clamped dt of
 * running frames only, so pauses never advance it and resuming never jumps.
 */
export class FrameLoop {
  pauseReasons = new Set();
  deps;
  elapsed = 0;
  lastTime = null;
  pendingId = null;
  started = false;
  disposed = false;

  constructor(deps) {
    this.deps = deps;
  }

  /** Active animation time in seconds. */
  get t() {
    return this.elapsed;
  }

  start() {
    this.started = true;
    this.schedule();
  }

  addPause(reason) {
    this.pauseReasons.add(reason);
    this.cancelPending();
  }

  removePause(reason) {
    if (!this.pauseReasons.delete(reason) || this.pauseReasons.size > 0) {
      return;
    }
    if (this.lastTime !== null) {
      this.lastTime = this.deps.now();
    }
    this.schedule();
  }

  /** Wakes an idle loop: re-anchors the frame clock (no dt jump) and requests one frame. */
  invalidate() {
    if (!this.started || this.disposed || this.pauseReasons.size > 0 || this.pendingId !== null) {
      return;
    }
    if (this.lastTime !== null) {
      this.lastTime = this.deps.now();
    }
    this.schedule();
  }

  /** Restarts the animation clock: the next frame runs at t = 0. */
  reset() {
    this.elapsed = 0;
    this.lastTime = null;
  }

  dispose() {
    this.disposed = true;
    this.cancelPending();
  }

  schedule() {
    if (!this.started || this.disposed || this.pauseReasons.size > 0 || this.pendingId !== null) {
      return;
    }
    this.pendingId = this.deps.scheduler.request(this.tick);
  }

  cancelPending() {
    if (this.pendingId !== null) {
      this.deps.scheduler.cancel(this.pendingId);
      this.pendingId = null;
    }
  }

  tick = (nowMs) => {
    this.pendingId = null;
    if (this.disposed || this.pauseReasons.size > 0) {
      return;
    }
    let dt = 0;
    if (this.lastTime !== null) {
      dt = Math.min(Math.max((nowMs - this.lastTime) / 1000, 0), MAX_DT_S);
      this.elapsed += dt;
    }
    this.lastTime = nowMs;
    if (this.deps.onFrame(this.elapsed, dt)) {
      this.schedule();
    }
  };
}
