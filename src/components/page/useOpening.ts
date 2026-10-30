import { useCallback, useEffect, useRef, useState } from 'react';
import {
  openingAdvance,
  openingDeadline,
  openingInitial,
  openingSample,
  openingSceneFailed,
  openingSceneReady,
  openingScroll,
  type OpeningPhase,
  type OpeningSample,
  type OpeningState,
} from '../../lib/motion/opening.ts';
import type { SceneStatus } from '../skull-hero/useSkullScene.ts';

export interface UseOpeningOptions {
  reducedMotion: boolean;
  /** Wall clock in ms; defaults to `performance.now`. */
  now?: () => number;
}

export interface OpeningControl {
  phase: OpeningPhase;
  /** Maps the wall clock to the scene inputs; stable across renders. */
  sampleOpening: (nowMs: number) => OpeningSample;
  /** Feeds the scene status: `ready` starts the zoom, `failed`/`lost` end the opening. */
  reportStatus: (status: SceneStatus) => void;
}

/**
 * Owns the opening on the wall clock (design Decisions 20 and 31): the pure state lives in a
 * ref, the phase is mirrored into React state (re-render only on a phase change), one timer
 * is armed to the next deadline and a passive once `scroll` listener exists while waiting,
 * zooming and holding (a scroll skips the wait or starts the explosion at once).
 */
export function useOpening({ reducedMotion, now }: UseOpeningOptions): OpeningControl {
  const clockRef = useRef(now ?? (() => performance.now()));
  clockRef.current = now ?? clockRef.current;
  const stateRef = useRef<OpeningState | null>(null);
  stateRef.current ??= openingInitial(clockRef.current(), !reducedMotion);
  const [phase, setPhase] = useState<OpeningPhase>(stateRef.current.phase);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const mountedRef = useRef(false);

  const apply = useCallback((next: OpeningState): void => {
    stateRef.current = next;
    setPhase(next.phase);
  }, []);

  const schedule = useCallback((): void => {
    clearTimeout(timerRef.current);
    timerRef.current = undefined;
    const state = stateRef.current;
    const deadline = mountedRef.current && state !== null ? openingDeadline(state) : null;
    if (state === null || deadline === null) {
      return;
    }
    timerRef.current = setTimeout(
      () => {
        timerRef.current = undefined;
        apply(openingAdvance(stateRef.current as OpeningState, clockRef.current()));
        schedule();
      },
      Math.max(0, deadline - clockRef.current()),
    );
  }, [apply]);

  useEffect(() => {
    mountedRef.current = true;
    schedule();
    return () => {
      mountedRef.current = false;
      clearTimeout(timerRef.current);
      timerRef.current = undefined;
    };
  }, [schedule]);

  useEffect(() => {
    if (phase !== 'waiting' && phase !== 'zoom' && phase !== 'hold') {
      return;
    }
    const onScroll = (): void => {
      apply(openingScroll(stateRef.current as OpeningState, clockRef.current()));
      schedule();
    };
    window.addEventListener('scroll', onScroll, { passive: true, once: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [phase, apply, schedule]);

  useEffect(() => {
    if (reducedMotion) {
      apply(openingSceneFailed(stateRef.current as OpeningState));
      schedule();
    }
  }, [reducedMotion, apply, schedule]);

  const sampleOpening = useCallback(
    (nowMs: number): OpeningSample => openingSample(stateRef.current as OpeningState, nowMs),
    [],
  );

  const reportStatus = useCallback(
    (status: SceneStatus): void => {
      const state = stateRef.current as OpeningState;
      if (status === 'ready') {
        apply(openingSceneReady(state, clockRef.current()));
      } else if (status === 'failed' || status === 'lost') {
        apply(openingSceneFailed(state));
      } else {
        return;
      }
      schedule();
    },
    [apply, schedule],
  );

  return { phase, sampleOpening, reportStatus };
}
