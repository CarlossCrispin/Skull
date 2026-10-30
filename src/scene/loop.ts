import { MAX_DT_S } from '../lib/motion/constants.ts';
import type { FrameScheduler } from './ports.ts';

export type LoopPauseReason = 'hidden' | 'reduced-motion' | 'context-lost';

export interface FrameLoopDeps {
  scheduler: FrameScheduler;
  /** Wall clock in milliseconds; used only to re-anchor the frame clock on resume. */
  now: () => number;
  /**
   * Frame body: `t` is the active animation time in seconds, `dt` the clamped step.
   * Returns `true` when another frame is needed; `false` idles the loop until `invalidate()`.
   */
  onFrame: (t: number, dt: number) => boolean;
}

/**
 * Pause-aware, demand-driven frame loop (design D8, D10). A frame is requested
 * only while the pause-reason set is empty and the last frame asked for more. The animation clock accumulates clamped dt of
 * running frames only, so pauses never advance it and resuming never jumps.
 */
export class FrameLoop {
  readonly pauseReasons = new Set<LoopPauseReason>();
  private readonly deps: FrameLoopDeps;
  private elapsed = 0;
  private lastTime: number | null = null;
  private pendingId: number | null = null;
  private started = false;
  private disposed = false;

  constructor(deps: FrameLoopDeps) {
    this.deps = deps;
  }

  /** Active animation time in seconds. */
  get t(): number {
    return this.elapsed;
  }

  start(): void {
    this.started = true;
    this.schedule();
  }

  addPause(reason: LoopPauseReason): void {
    this.pauseReasons.add(reason);
    this.cancelPending();
  }

  removePause(reason: LoopPauseReason): void {
    if (!this.pauseReasons.delete(reason) || this.pauseReasons.size > 0) {
      return;
    }
    if (this.lastTime !== null) {
      this.lastTime = this.deps.now();
    }
    this.schedule();
  }

  /** Wakes an idle loop: re-anchors the frame clock (no dt jump) and requests one frame. */
  invalidate(): void {
    if (!this.started || this.disposed || this.pauseReasons.size > 0 || this.pendingId !== null) {
      return;
    }
    if (this.lastTime !== null) {
      this.lastTime = this.deps.now();
    }
    this.schedule();
  }

  /** Restarts the animation clock: the next frame runs at t = 0. */
  reset(): void {
    this.elapsed = 0;
    this.lastTime = null;
  }

  dispose(): void {
    this.disposed = true;
    this.cancelPending();
  }

  private schedule(): void {
    if (!this.started || this.disposed || this.pauseReasons.size > 0 || this.pendingId !== null) {
      return;
    }
    this.pendingId = this.deps.scheduler.request(this.tick);
  }

  private cancelPending(): void {
    if (this.pendingId !== null) {
      this.deps.scheduler.cancel(this.pendingId);
      this.pendingId = null;
    }
  }

  private readonly tick = (nowMs: number): void => {
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
