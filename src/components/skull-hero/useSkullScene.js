import { useEffect, useRef, useState } from 'react';
import { supportsWebGL2 } from '../../lib/webgl/supportsWebGL2.js';

/**
 * `loading` precedes the first frame; `lost` is a context loss (may recover); `failed` is final.
 *
 * @typedef {'loading' | 'ready' | 'lost' | 'failed'} SceneStatus
 */

/**
 * @typedef {object} SkullSceneDeps
 * @property {() => boolean} supportsWebGL2
 * @property {() => Promise<SkullSceneModule>} loadScene - The only place `three` is reached: a dynamic import, so it lands in its own chunk.
 */

/**
 * @typedef {object} UseSkullSceneOptions
 * @property {RefObject<HTMLElement | null>} hostRef
 * @property {boolean} reducedMotion
 * @property {() => ScrollFrame} readScrollFrame
 * @property {(scene: SkullScene | null) => void} onScene - Receives the live scene (or null once disposed) for the driver wiring.
 * @property {SkullSceneOptions['onPresent']} [onPresent] - Called synchronously after every rendered frame (the glass frame mirror); may change between renders.
 * @property {Partial<SkullSceneDeps>} [deps]
 */

const defaultDeps = {
  supportsWebGL2,
  loadScene: () => import('../../scene/SkullScene.js'),
};

/**
 * Probes WebGL2, then lazily imports and mounts the vanilla three scene
 * (design D11). Unsupported devices never download three. Effect cleanup
 * disposes the instance and ignores an import that resolves afterwards
 * (StrictMode safe).
 */
export function useSkullScene(options) {
  const { hostRef, readScrollFrame, onScene } = options;
  const [status, setStatus] = useState('loading');
  const sceneRef = useRef(null);
  const reducedRef = useRef(options.reducedMotion);
  const presentRef = useRef(options.onPresent);
  presentRef.current = options.onPresent;
  const hasPresentConsumer = options.onPresent !== undefined;
  const depsRef = useRef(options.deps);
  reducedRef.current = options.reducedMotion;

  useEffect(() => {
    const deps = { ...defaultDeps, ...depsRef.current };
    if (!deps.supportsWebGL2()) {
      setStatus('failed');
      return;
    }
    let cancelled = false;
    let instance = null;

    void deps.loadScene().then(({ SkullScene: Scene }) => {
      const host = hostRef.current;
      if (cancelled || host === null) {
        return;
      }
      instance = new Scene({
        container: host,
        reducedMotion: reducedRef.current,
        readScrollFrame,
        onPresent: hasPresentConsumer ? (canvas, nowMs) => presentRef.current?.(canvas, nowMs) : undefined,
        onReady: () => !cancelled && setStatus('ready'),
        onLost: () => !cancelled && setStatus('lost'),
        onFailure: () => !cancelled && setStatus('failed'),
      });
      sceneRef.current = instance;
      instance.start();
      onScene(instance);
    });

    return () => {
      cancelled = true;
      instance?.dispose();
      if (instance !== null) {
        instance = null;
        sceneRef.current = null;
        onScene(null);
      }
    };
  }, [hostRef, readScrollFrame, onScene, hasPresentConsumer]);

  useEffect(() => {
    sceneRef.current?.setReducedMotion(options.reducedMotion);
  }, [options.reducedMotion]);

  return status;
}
