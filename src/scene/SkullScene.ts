import { Group, PerspectiveCamera, Scene, type Material } from 'three';
import { initialAssembly, latticeOpacity, needsFrame, stepAssembly, type AssemblyState } from '../lib/motion/assembly.ts';
import { OPENING_DONE, type OpeningSample } from '../lib/motion/opening.ts';
import { composePose, zoomStageZ, type Pose } from '../lib/motion/pose.ts';
import { buildSkull, type SkullObjects } from './buildSkullMesh.ts';
import { LATTICE_ENABLED } from './constants.ts';
import { CAMERA_DISTANCE, capDpr, deriveFovDegrees, worldUnitsPerViewportHeight } from './framing.ts';
import { patchVoxelMaterial } from './material/voxelMaterial.ts';
import { createLightRig } from './lighting.ts';
import { FrameLoop } from './loop.ts';
import {
  createWebGLRenderer,
  rafScheduler,
  type FrameScheduler,
  type MaterialPatcher,
  type RendererFactory,
  type RendererPort,
} from './ports.ts';
import { shouldResizeRenderer } from './scatter/layout.ts';
import { generateSkull } from './voxel/generate.ts';

export type PauseReason = 'hidden';

/** Per-frame scroll input: the assembly target in [0, 1] and the opening sample (missing = done). */
export interface ScrollFrame {
  readonly target: number;
  readonly opening?: OpeningSample;
}

export interface SkullSceneDeps {
  createRenderer: RendererFactory;
  scheduler: FrameScheduler;
  now: () => number;
  patchMaterial: MaterialPatcher;
  devicePixelRatio: () => number;
}

export interface SkullSceneOptions {
  container: HTMLElement;
  reducedMotion: boolean;
  lattice?: boolean;
  /** Read once per rendered frame; must not force layout. */
  readScrollFrame: () => ScrollFrame;
  /** First frame presented (also after a context restore). */
  onReady: () => void;
  /** Context lost; the poster must show. */
  onLost: () => void;
  onFailure: (reason: 'renderer' | 'patch' | 'restore' | 'render') => void;
  /**
   * Called synchronously right after every successful `renderer.render` (also after a
   * context restore), so a consumer can copy the canvas before the drawing buffer is cleared.
   */
  onPresent?: (canvas: HTMLCanvasElement, nowMs: number) => void;
  deps?: Partial<SkullSceneDeps>;
}

const NEAR = 1;
const FAR = 400;

/**
 * Vanilla three scene for the voxel skull. Owns the renderer, the pause-aware
 * frame loop and the canvas context events; it never observes the DOM itself.
 */
export class SkullScene {
  private readonly opts: SkullSceneOptions;
  private readonly deps: SkullSceneDeps;
  private renderer: RendererPort | null = null;
  private loop: FrameLoop | null = null;
  private objects: SkullObjects | null = null;
  private readonly scene = new Scene();
  /** Outer group: the zoom dolly along z. Holds the yaw/drift group and the lattice. */
  private readonly stage = new Group();
  private readonly group = new Group();
  private readonly camera = new PerspectiveCamera(45, 1, NEAR, FAR);
  private width = 1;
  private height = 1;
  private started = false;
  private reduced: boolean;
  private assembly: AssemblyState = initialAssembly();
  private lastFrameKey: string | null = null;
  private presentRequested = false;
  private hasPresented = false;
  private disposed = false;

  constructor(opts: SkullSceneOptions) {
    this.opts = opts;
    this.reduced = opts.reducedMotion;
    this.deps = {
      createRenderer: createWebGLRenderer,
      scheduler: rafScheduler,
      now: () => performance.now(),
      patchMaterial: patchVoxelMaterial,
      devicePixelRatio: () => window.devicePixelRatio || 1,
      ...opts.deps,
    };
    try {
      this.renderer = this.deps.createRenderer(document.createElement('canvas'));
    } catch {
      this.disposed = true;
      opts.onFailure('renderer');
      return;
    }
    this.objects = buildSkull(generateSkull(), {
      lattice: opts.lattice ?? LATTICE_ENABLED,
      patcher: this.deps.patchMaterial,
    });
    if (!this.objects.patched) {
      // Without the patch there is no scatter: never render a plain assembled skull.
      opts.onFailure('patch');
      this.dispose();
      return;
    }
    this.group.add(this.objects.mesh);
    this.stage.add(this.group);
    if (this.objects.lattice !== null) {
      this.stage.add(this.objects.lattice);
    }
    this.scene.add(this.stage, createLightRig());
    this.camera.position.set(0, 0, CAMERA_DISTANCE);
    this.loop = new FrameLoop({
      scheduler: this.deps.scheduler,
      now: this.deps.now,
      onFrame: (_t, dt) => this.frame(dt),
    });
    if (this.reduced) {
      // The poster backdrop owns the picture; nothing is ever rendered while reduced.
      this.loop.addPause('reduced-motion');
    }
    opts.container.appendChild(this.renderer.domElement);
    this.renderer.domElement.addEventListener('webglcontextlost', this.onContextLost);
    this.renderer.domElement.addEventListener('webglcontextrestored', this.onContextRestored);
    this.applyViewport(opts.container.clientWidth, opts.container.clientHeight);
  }

  start(): void {
    if (this.disposed || this.started) {
      return;
    }
    this.started = true;
    this.loop?.start();
  }

  /** Wakes the demand loop (scroll, resize); a no-op while paused, reduced or disposed. */
  invalidate(): void {
    if (!this.disposed) {
      this.loop!.invalidate();
    }
  }

  /** Forces the next frame to render and publish even if nothing changed (a late consumer needs a copy). */
  requestPresent(): void {
    if (this.disposed) {
      return;
    }
    this.presentRequested = true;
    this.invalidate();
  }

  setPaused(reason: PauseReason, paused: boolean): void {
    if (this.disposed) {
      return;
    }
    if (paused) {
      this.loop!.addPause(reason);
    } else {
      this.loop!.removePause(reason);
    }
  }

  setReducedMotion(on: boolean): void {
    if (this.disposed || on === this.reduced) {
      return;
    }
    this.reduced = on;
    if (on) {
      this.loop!.addPause('reduced-motion');
    } else {
      this.loop!.removePause('reduced-motion');
    }
  }

  resize(width: number, height: number): void {
    if (this.disposed) {
      return;
    }
    const next = { w: Math.max(1, width), h: Math.max(1, height) };
    if (!shouldResizeRenderer({ w: this.width, h: this.height }, next)) {
      return;
    }
    this.applyViewport(width, height);
    this.invalidate();
  }

  /** Idempotent: cancels the frame, removes listeners, frees GPU resources and the canvas. */
  dispose(): void {
    if (this.disposed) {
      return;
    }
    this.disposed = true;
    this.loop?.dispose();
    const renderer = this.renderer;
    if (renderer === null) {
      return;
    }
    const canvas = renderer.domElement;
    canvas.removeEventListener('webglcontextlost', this.onContextLost);
    canvas.removeEventListener('webglcontextrestored', this.onContextRestored);
    this.objects?.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
    canvas.remove();
  }

  private readonly onContextLost = (event: Event): void => {
    if (this.disposed) {
      return;
    }
    event.preventDefault();
    this.loop!.addPause('context-lost');
    this.opts.onLost();
  };

  private readonly onContextRestored = (): void => {
    if (this.disposed) {
      return;
    }
    try {
      this.renderer!.render(this.scene, this.camera);
    } catch {
      this.opts.onFailure('restore');
      this.dispose();
      return;
    }
    this.publish();
    this.loop!.removePause('context-lost');
    this.opts.onReady();
  };

  private applyViewport(width: number, height: number): void {
    this.width = Math.max(1, width);
    this.height = Math.max(1, height);
    const renderer = this.renderer!;
    renderer.setPixelRatio(capDpr(this.deps.devicePixelRatio()));
    renderer.setSize(this.width, this.height, false);
    this.camera.aspect = this.width / this.height;
    this.camera.fov = deriveFovDegrees(this.width, this.height);
    this.camera.updateProjectionMatrix();
    const halfH = worldUnitsPerViewportHeight(this.width, this.height) / 2;
    this.objects!.uniforms.uScatterScale.value.set(halfH * this.camera.aspect, halfH);
  }

  private applyPose(pose: Pose): void {
    const unitsPerVh = worldUnitsPerViewportHeight(this.width, this.height);
    this.group.rotation.y = pose.yaw;
    this.group.position.set(pose.offsetX * unitsPerVh, pose.offsetY * unitsPerVh, 0);
    this.group.scale.setScalar(pose.scale);
  }

  /** One frame: advance the assembly, write uniforms, render. True when another frame is needed. */
  private frame(dt: number): boolean {
    const { target, opening = OPENING_DONE } = this.opts.readScrollFrame();
    const state = stepAssembly(this.assembly, target, dt, opening);
    this.assembly = state;
    const more = needsFrame(state, target, opening);
    // A wake that would repeat the last presented frame renders and publishes nothing.
    const key = `${state.progress}|${state.rotationT}|${opening.zoom}|${this.width}x${this.height}`;
    if (key === this.lastFrameKey && !this.presentRequested) {
      return more;
    }
    this.objects!.uniforms.uProgress.value = state.progress;
    this.stage.position.z = zoomStageZ(opening.zoom);
    this.applyLattice(state.progress);
    this.applyPose(composePose(state.rotationT));
    this.presentRequested = false;
    this.lastFrameKey = key;
    return this.present() && more;
  }

  private applyLattice(progress: number): void {
    const lattice = this.objects!.lattice;
    if (lattice === null) {
      return;
    }
    const opacity = latticeOpacity(progress);
    (lattice.material as Material).opacity = opacity;
    lattice.visible = opacity > 0;
  }

  /** Renders once; false when the render failed and the scene was disposed. */
  private present(): boolean {
    try {
      this.renderer!.render(this.scene, this.camera);
    } catch {
      this.opts.onFailure('render');
      this.dispose();
      return false;
    }
    this.publish();
    if (!this.hasPresented) {
      this.hasPresented = true;
      this.opts.onReady();
    }
    return true;
  }

  /** A throwing consumer must never kill the scene: its error is swallowed here. */
  private publish(): void {
    try {
      this.opts.onPresent?.(this.renderer!.domElement, this.deps.now());
    } catch {
      // The glass copy is optional; the scene keeps rendering.
    }
  }
}
