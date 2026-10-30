import type { Camera, Scene } from 'three';
import type { FrameScheduler, RendererPort } from './ports.ts';

/** Manual scheduler: frames run only when the test calls `tick`. */
export class ManualScheduler implements FrameScheduler {
  private nextId = 1;
  private readonly pending = new Map<number, (nowMs: number) => void>();
  requested = 0;

  request(callback: (nowMs: number) => void): number {
    const id = this.nextId++;
    this.requested++;
    this.pending.set(id, callback);
    return id;
  }

  cancel(id: number): void {
    this.pending.delete(id);
  }

  get pendingCount(): number {
    return this.pending.size;
  }

  /** Runs the oldest pending callback with `nowMs`; returns false when none is pending. */
  tick(nowMs: number): boolean {
    const first = this.pending.entries().next();
    if (first.done === true) {
      return false;
    }
    const [id, callback] = first.value;
    this.pending.delete(id);
    callback(nowMs);
    return true;
  }
}

/** Mutable injected clock in milliseconds. */
export class FakeClock {
  value = 0;
  readonly now = (): number => this.value;
}

/** Recording renderer double; no GL. */
export class FakeRenderer implements RendererPort {
  readonly domElement = document.createElement('canvas');
  readonly renders: Array<{ scene: Scene; camera: Camera }> = [];
  readonly sizes: Array<[number, number, boolean]> = [];
  pixelRatio = 0;
  disposed = 0;
  contextLosses = 0;
  throwOnRender = false;

  setPixelRatio(ratio: number): void {
    this.pixelRatio = ratio;
  }

  setSize(width: number, height: number, updateStyle: false): void {
    this.sizes.push([width, height, updateStyle]);
  }

  render(scene: Scene, camera: Camera): void {
    if (this.throwOnRender) {
      throw new Error('render failed');
    }
    this.renders.push({ scene, camera });
  }

  dispose(): void {
    this.disposed++;
  }

  forceContextLoss(): void {
    this.contextLosses++;
  }
}
