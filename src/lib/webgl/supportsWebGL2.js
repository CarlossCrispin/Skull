/**
 * Probes WebGL2 on a throwaway canvas and releases the probe context at once.
 * three 0.186 requires WebGL2, so WebGL1-only devices count as unsupported.
 */
export function supportsWebGL2(
  createCanvas = () => document.createElement('canvas'),
) {
  try {
    const context = createCanvas().getContext('webgl2');
    if (context === null || context === undefined) {
      return false;
    }
    context.getExtension('WEBGL_lose_context')?.loseContext();
    return true;
  } catch {
    return false;
  }
}
