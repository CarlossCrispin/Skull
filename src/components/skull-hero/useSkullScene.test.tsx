import { act, render as renderTree, renderHook } from '@testing-library/react';
import { StrictMode, type RefObject } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { ScrollFrame, SkullSceneOptions } from '../../scene/SkullScene.ts';
import { useSkullScene, type SkullSceneModule } from './useSkullScene.ts';

class FakeScene {
  static live = 0;
  static created: FakeScene[] = [];
  disposed = false;
  started = 0;
  reduced: boolean[] = [];
  readonly opts: SkullSceneOptions;
  constructor(opts: SkullSceneOptions) {
    this.opts = opts;
    FakeScene.live += 1;
    FakeScene.created.push(this);
  }
  start(): void {
    this.started += 1;
  }
  setReducedMotion(on: boolean): void {
    this.reduced.push(on);
  }
  setPaused(): void {}
  resize(): void {}
  invalidate(): void {}
  dispose(): void {
    if (!this.disposed) {
      this.disposed = true;
      FakeScene.live -= 1;
    }
  }
}

function setup() {
  FakeScene.live = 0;
  FakeScene.created = [];
  const resolvers: Array<(module: SkullSceneModule) => void> = [];
  const loadScene = vi.fn(
    () =>
      new Promise<SkullSceneModule>((r) => {
        resolvers.push(r);
      }),
  );
  const host = document.createElement('div');
  const hostRef: RefObject<HTMLElement | null> = { current: host };
  const readScrollFrame = vi.fn((): ScrollFrame => ({ target: 0 }));
  const onScene = vi.fn();
  const settle = () => act(async () => {
    for (const resolve of resolvers) resolve({ SkullScene: FakeScene as unknown as SkullSceneModule['SkullScene'] });
  });
  return { loadScene, hostRef, readScrollFrame, onScene, settle };
}

type Setup = ReturnType<typeof setup>;

function render(
  s: Setup,
  extra: { supported?: boolean; reducedMotion?: boolean; onPresent?: SkullSceneOptions['onPresent'] } = {},
) {
  return renderHook(
    ({ reducedMotion }: { reducedMotion: boolean }) =>
      useSkullScene({
        hostRef: s.hostRef,
        reducedMotion,
        readScrollFrame: s.readScrollFrame,
        onScene: s.onScene,
        onPresent: extra.onPresent,
        deps: { supportsWebGL2: () => extra.supported ?? true, loadScene: s.loadScene },
      }),
    { initialProps: { reducedMotion: extra.reducedMotion ?? false } },
  );
}

describe('useSkullScene', () => {
  it('stays on the poster, without importing three, when WebGL2 is unsupported', () => {
    const s = setup();
    const { result } = render(s, { supported: false });
    expect(s.loadScene).not.toHaveBeenCalled();
    expect(result.current).toBe('failed');
    expect(FakeScene.created).toHaveLength(0);
  });

  it('imports lazily when supported, then constructs and starts one scene', async () => {
    const s = setup();
    const { result } = render(s);
    expect(result.current).toBe('loading');
    expect(s.loadScene).toHaveBeenCalledTimes(1);
    expect(FakeScene.created).toHaveLength(0);

    await s.settle();
    expect(FakeScene.created).toHaveLength(1);
    const scene = FakeScene.created[0]!;
    expect(scene.started).toBe(1);
    expect(scene.opts.container).toBe(s.hostRef.current);
    expect(scene.opts.reducedMotion).toBe(false);
    expect(scene.opts.readScrollFrame).toBe(s.readScrollFrame);
    expect(s.onScene).toHaveBeenLastCalledWith(scene);
  });

  it('maps onReady to ready and onLost to lost, and a later onReady back to ready', async () => {
    const s = setup();
    const { result } = render(s);
    await s.settle();
    const { opts } = FakeScene.created[0]!;

    act(() => opts.onReady());
    expect(result.current).toBe('ready');
    act(() => opts.onLost());
    expect(result.current).toBe('lost');
    act(() => opts.onReady());
    expect(result.current).toBe('ready');
  });

  it('maps every failure reason (renderer, patch, restore, render) to failed', async () => {
    const s = setup();
    const { result } = render(s);
    await s.settle();
    const { opts } = FakeScene.created[0]!;
    for (const reason of ['renderer', 'patch', 'restore', 'render'] as const) {
      act(() => opts.onReady());
      expect(result.current).toBe('ready');
      act(() => opts.onFailure(reason));
      expect(result.current).toBe('failed');
    }
  });

  it('passes the initial reduced-motion preference and forwards later changes', async () => {
    const s = setup();
    const { rerender } = render(s, { reducedMotion: true });
    await s.settle();
    const scene = FakeScene.created[0]!;
    expect(scene.opts.reducedMotion).toBe(true);

    rerender({ reducedMotion: false });
    expect(scene.reduced.at(-1)).toBe(false);
  });

  it('ignores an import that resolves after unmount and leaks no instance', async () => {
    const s = setup();
    const { unmount } = render(s);
    unmount();
    await s.settle();
    expect(FakeScene.created).toHaveLength(0);
    expect(FakeScene.live).toBe(0);
  });

  it('disposes the created instance on unmount and clears the scene reference', async () => {
    const s = setup();
    const { unmount } = render(s);
    await s.settle();
    expect(FakeScene.live).toBe(1);
    unmount();
    expect(FakeScene.created[0]!.disposed).toBe(true);
    expect(FakeScene.live).toBe(0);
    expect(s.onScene).toHaveBeenLastCalledWith(null);
  });

  it('survives StrictMode mount-unmount-mount with exactly one live instance', async () => {
    const s = setup();
    function Probe() {
      useSkullScene({
        hostRef: s.hostRef,
        reducedMotion: false,
        readScrollFrame: s.readScrollFrame,
        onScene: s.onScene,
        deps: { supportsWebGL2: () => true, loadScene: s.loadScene },
      });
      return null;
    }
    renderTree(
      <StrictMode>
        <Probe />
      </StrictMode>,
    );
    // StrictMode ran the effect twice; both imports resolve, only the live effect may build a scene.
    expect(s.loadScene).toHaveBeenCalledTimes(2);
    await s.settle();
    expect(FakeScene.live).toBe(1);
  });
});

describe('useSkullScene frame publishing', () => {
  const canvas = {} as HTMLCanvasElement;

  it('forwards the scene present callback to the consumer', async () => {
    const s = setup();
    const onPresent = vi.fn();
    render(s, { onPresent });
    await s.settle();
    const { opts } = FakeScene.created[0]!;
    expect(opts.onPresent).toBeTypeOf('function');
    opts.onPresent!(canvas, 42);
    expect(onPresent).toHaveBeenCalledTimes(1);
    expect(onPresent).toHaveBeenCalledWith(canvas, 42);
  });

  it('follows a newer consumer without recreating the scene', async () => {
    const s = setup();
    const first = vi.fn();
    const second = vi.fn();
    const view = renderHook(
      ({ onPresent }: { onPresent: SkullSceneOptions['onPresent'] }) =>
        useSkullScene({
          hostRef: s.hostRef,
          reducedMotion: false,
          readScrollFrame: s.readScrollFrame,
          onScene: s.onScene,
          onPresent,
          deps: { supportsWebGL2: () => true, loadScene: s.loadScene },
        }),
      { initialProps: { onPresent: first } },
    );
    await s.settle();
    view.rerender({ onPresent: second });
    FakeScene.created[0]!.opts.onPresent!(canvas, 7);
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledWith(canvas, 7);
    expect(FakeScene.created).toHaveLength(1);
  });

  it('passes no present callback when there is no consumer', async () => {
    const s = setup();
    render(s);
    await s.settle();
    expect(FakeScene.created[0]!.opts.onPresent).toBeUndefined();
  });
});
