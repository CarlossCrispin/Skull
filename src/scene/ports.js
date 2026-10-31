import {
  NoToneMapping,
  SRGBColorSpace,
  WebGLRenderer,
} from 'three';

/**
 * The slice of a renderer that `SkullScene` depends on (hexagonal seam, design D2).
 *
 * @typedef {object} RendererPort
 * @property {HTMLCanvasElement} domElement
 * @property {Function} setPixelRatio
 * @property {Function} setSize
 * @property {Function} render
 * @property {Function} dispose
 * @property {Function} forceContextLoss
 */

/**
 * Creates a renderer bound to `canvas`. May throw (no WebGL, blocked context).
 *
 * @typedef {(canvas: HTMLCanvasElement) => RendererPort} RendererFactory
 */

/**
 * Frame scheduling seam; the real one is `requestAnimationFrame`.
 *
 * @typedef {object} FrameScheduler
 * @property {number} request
 * @property {Function} cancel
 */

/**
 * The slice of `WebGLRenderer` that exposes compiled program diagnostics.
 *
 * @typedef {object} ProgramDiagnosticsSource
 * @property {{ programs: readonly object[] | null }} info
 * @property {Function} render
 */

// three sets `diagnostics` at runtime but leaves it out of its typings.
function isUnrunnable(program) {
  return 'diagnostics' in program && program.diagnostics?.runnable === false;
}

/**
 * three logs a failed shader compile and keeps going, drawing nothing. This
 * turns an unrunnable program into a render error so callers fall back.
 */
export function failOnUnrunnablePrograms(renderer) {
  const render = renderer.render.bind(renderer);
  renderer.render = (scene, camera) => {
    render(scene, camera);
    if (renderer.info.programs?.some(isUnrunnable)) {
      throw new Error('WebGL shader program failed to compile');
    }
  };
}

/** Real WebGL renderer: transparent, antialiased, exact sRGB output, no tone mapping, no shadows. */
export const createWebGLRenderer = (canvas) => {
  const renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = NoToneMapping;
  renderer.shadowMap.enabled = false;
  failOnUnrunnablePrograms(renderer);
  return renderer;
};

/** Real scheduler backed by `requestAnimationFrame`. */
export const rafScheduler = {
  request: (callback) => requestAnimationFrame(callback),
  cancel: (id) => cancelAnimationFrame(id),
};
