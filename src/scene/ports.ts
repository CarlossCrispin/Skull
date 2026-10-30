import {
  NoToneMapping,
  SRGBColorSpace,
  WebGLRenderer,
  type Camera,
  type Scene,
} from 'three';
import type { MaterialPatcher } from './material/voxelMaterial.ts';

export type { MaterialPatcher };

/** The slice of a renderer that `SkullScene` depends on (hexagonal seam, design D2). */
export interface RendererPort {
  readonly domElement: HTMLCanvasElement;
  setPixelRatio(ratio: number): void;
  setSize(width: number, height: number, updateStyle: false): void;
  render(scene: Scene, camera: Camera): void;
  dispose(): void;
  forceContextLoss(): void;
}

/** Creates a renderer bound to `canvas`. May throw (no WebGL, blocked context). */
export type RendererFactory = (canvas: HTMLCanvasElement) => RendererPort;

/** Frame scheduling seam; the real one is `requestAnimationFrame`. */
export interface FrameScheduler {
  request(callback: (nowMs: number) => void): number;
  cancel(id: number): void;
}

/** The slice of `WebGLRenderer` that exposes compiled program diagnostics. */
export interface ProgramDiagnosticsSource {
  info: { programs: readonly object[] | null };
  render(scene: Scene, camera: Camera): void;
}

// three sets `diagnostics` at runtime but leaves it out of its typings.
function isUnrunnable(program: object): boolean {
  return 'diagnostics' in program && (program.diagnostics as { runnable?: boolean } | undefined)?.runnable === false;
}

/**
 * three logs a failed shader compile and keeps going, drawing nothing. This
 * turns an unrunnable program into a render error so callers fall back.
 */
export function failOnUnrunnablePrograms(renderer: ProgramDiagnosticsSource): void {
  const render = renderer.render.bind(renderer);
  renderer.render = (scene, camera) => {
    render(scene, camera);
    if (renderer.info.programs?.some(isUnrunnable)) {
      throw new Error('WebGL shader program failed to compile');
    }
  };
}

/** Real WebGL renderer: transparent, antialiased, exact sRGB output, no tone mapping, no shadows. */
export const createWebGLRenderer: RendererFactory = (canvas) => {
  const renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = NoToneMapping;
  renderer.shadowMap.enabled = false;
  failOnUnrunnablePrograms(renderer);
  return renderer;
};

/** Real scheduler backed by `requestAnimationFrame`. */
export const rafScheduler: FrameScheduler = {
  request: (callback) => requestAnimationFrame(callback),
  cancel: (id) => cancelAnimationFrame(id),
};
