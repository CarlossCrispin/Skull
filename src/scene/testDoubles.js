
/** Manual scheduler: frames run only when the test calls `tick`. */
export class ManualScheduler {
  nextId = 1;
  pending = new Map();
  requested = 0;

  request(callback) {
    const id = this.nextId++;
    this.requested++;
    this.pending.set(id, callback);
    return id;
  }

  cancel(id) {
    this.pending.delete(id);
  }

  get pendingCount() {
    return this.pending.size;
  }

  /** Runs the oldest pending callback with `nowMs`; returns false when none is pending. */
  tick(nowMs) {
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
  now = () => this.value;
}

/** Recording renderer double; no GL. */
export class FakeRenderer {
  domElement = document.createElement('canvas');
  renders = [];
  sizes = [];
  pixelRatio = 0;
  disposed = 0;
  contextLosses = 0;
  throwOnRender = false;

  setPixelRatio(ratio) {
    this.pixelRatio = ratio;
  }

  setSize(width, height, updateStyle) {
    this.sizes.push([width, height, updateStyle]);
  }

  render(scene, camera) {
    if (this.throwOnRender) {
      throw new Error('render failed');
    }
    this.renders.push({ scene, camera });
  }

  dispose() {
    this.disposed++;
  }

  forceContextLoss() {
    this.contextLosses++;
  }
}
