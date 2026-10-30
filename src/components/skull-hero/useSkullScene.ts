import { useEffect, useRef, useState, type RefObject } from 'react';
import { supportsWebGL2 } from '../../lib/webgl/supportsWebGL2.ts';
import type { ScrollFrame, SkullScene, SkullSceneOptions } from '../../scene/SkullScene.ts';

/** `loading` precedes the first frame; `lost` is a context loss (may recover); `failed` is final. */
export type SceneStatus = 'loading' | 'ready' | 'lost' | 'failed';

export interface SkullSceneModule {
  SkullScene: typeof SkullScene;
}

export interface SkullSceneDeps {
  supportsWebGL2: () => boolean;
  /** The only place `three` is reached: a dynamic import, so it lands in its own chunk. */
  loadScene: () => Promise<SkullSceneModule>;
}

export interface UseSkullSceneOptions {
  hostRef: RefObject<HTMLElement | null>;
  reducedMotion: boolean;
  readScrollFrame: () => ScrollFrame;
  /** Receives the live scene (or null once disposed) for the driver wiring. */
  onScene: (scene: SkullScene | null) => void;
  /** Called synchronously after every rendered frame (the glass frame mirror); may change between renders. */
  onPresent?: SkullSceneOptions['onPresent'];
  deps?: Partial<SkullSceneDeps>;
}

const defaultDeps: SkullSceneDeps = {
  supportsWebGL2,
  loadScene: () => import('../../scene/SkullScene.ts'),
};

/**
 * Probes WebGL2, then lazily imports and mounts the vanilla three scene
 * (design D11). Unsupported devices never download three. Effect cleanup
 * disposes the instance and ignores an import that resolves afterwards
 * (StrictMode safe).
 */
export function useSkullScene(options: UseSkullSceneOptions): SceneStatus {
  const { hostRef, readScrollFrame, onScene } = options;
  const [status, setStatus] = useState<SceneStatus>('loading');
  const sceneRef = useRef<SkullScene | null>(null);
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
    let instance: SkullScene | null = null;

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
