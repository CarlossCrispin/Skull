import { act, renderHook } from '@testing-library/react';
import { StrictMode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { easeOutCubic } from '../../lib/motion/easing.ts';
import { useOpening } from './useOpening.ts';

let clock = 0;
const now = () => clock;

function tick(ms: number): void {
  act(() => {
    clock += ms;
    vi.advanceTimersByTime(ms);
  });
}

function scroll(): void {
  act(() => {
    window.dispatchEvent(new Event('scroll'));
  });
}

function mount(reducedMotion = false, strict = false) {
  let renders = 0;
  const view = renderHook(
    (props: { reducedMotion: boolean }) => {
      renders += 1;
      return useOpening({ reducedMotion: props.reducedMotion, now });
    },
    { initialProps: { reducedMotion }, ...(strict ? { wrapper: StrictMode } : {}) },
  );
  return { ...view, renders: () => renders };
}

beforeEach(() => {
  vi.useFakeTimers();
  clock = 0;
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('useOpening phases', () => {
  it('starts in waiting with normal motion and done with reduced motion', () => {
    expect(mount(false).result.current.phase).toBe('waiting');
    expect(mount(true).result.current.phase).toBe('done');
  });

  it('skips to done after the max wait when the scene never reports ready, re-rendering once', () => {
    const { result, renders } = mount();
    const before = renders();
    tick(3999);
    expect(result.current.phase).toBe('waiting');
    expect(renders()).toBe(before);
    tick(1);
    expect(result.current.phase).toBe('done');
    expect(renders()).toBe(before + 1);
  });

  it('moves waiting to zoom on ready, then hold, exploding and done at each deadline', () => {
    const { result } = mount();
    tick(100);
    act(() => result.current.reportStatus('ready'));
    expect(result.current.phase).toBe('zoom');
    tick(1599);
    expect(result.current.phase).toBe('zoom');
    tick(1);
    expect(result.current.phase).toBe('hold');
    tick(799);
    expect(result.current.phase).toBe('hold');
    tick(1);
    expect(result.current.phase).toBe('exploding');
    tick(1199);
    expect(result.current.phase).toBe('exploding');
    tick(1);
    expect(result.current.phase).toBe('done');
    expect(vi.getTimerCount()).toBe(0);
  });

  it('re-renders only on a phase change', () => {
    const { result, renders } = mount();
    act(() => result.current.reportStatus('ready'));
    const before = renders();
    tick(1500);
    expect(renders()).toBe(before);
    tick(100);
    expect(renders()).toBe(before + 1);
  });

  it('ignores a loading report', () => {
    const { result } = mount();
    act(() => result.current.reportStatus('loading'));
    tick(3999);
    expect(result.current.phase).toBe('waiting');
  });

  it.each(['failed', 'lost'] as const)('ends the waiting opening skipped when the scene reports %s', (status) => {
    const { result } = mount();
    act(() => result.current.reportStatus(status));
    expect(result.current.phase).toBe('done');
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each(['failed', 'lost'] as const)('ends the zoom and the hold when the scene reports %s', (status) => {
    const zoom = mount();
    act(() => zoom.result.current.reportStatus('ready'));
    tick(500);
    expect(zoom.result.current.phase).toBe('zoom');
    act(() => zoom.result.current.reportStatus(status));
    expect(zoom.result.current.phase).toBe('done');

    const hold = mount();
    act(() => hold.result.current.reportStatus('ready'));
    tick(1700);
    expect(hold.result.current.phase).toBe('hold');
    act(() => hold.result.current.reportStatus(status));
    expect(hold.result.current.phase).toBe('done');
  });

  it('ends a running explosion when the scene is lost', () => {
    const { result } = mount();
    act(() => result.current.reportStatus('ready'));
    tick(2400);
    expect(result.current.phase).toBe('exploding');
    act(() => result.current.reportStatus('lost'));
    expect(result.current.phase).toBe('done');
  });
});

describe('useOpening scroll', () => {
  it('registers a passive once scroll listener while waiting', () => {
    const add = vi.spyOn(window, 'addEventListener');
    mount();
    const calls = add.mock.calls.filter(([type]) => type === 'scroll');
    expect(calls).toHaveLength(1);
    expect(calls[0]?.[2]).toEqual({ passive: true, once: true });
  });

  it('keeps a listener through zoom and hold, and removes it once exploding starts', () => {
    const add = vi.spyOn(window, 'addEventListener');
    const remove = vi.spyOn(window, 'removeEventListener');
    const { result } = mount();
    const live = () =>
      add.mock.calls.filter(([type]) => type === 'scroll').length -
      remove.mock.calls.filter(([type]) => type === 'scroll').length;
    act(() => result.current.reportStatus('ready'));
    expect(result.current.phase).toBe('zoom');
    expect(live()).toBe(1);
    tick(1600);
    expect(result.current.phase).toBe('hold');
    expect(live()).toBe(1);
    tick(800);
    expect(result.current.phase).toBe('exploding');
    expect(live()).toBe(0);
  });

  it('explodes at once on a scroll during the zoom while the zoom keeps running', () => {
    const { result } = mount();
    tick(100);
    act(() => result.current.reportStatus('ready'));
    tick(600);
    scroll();
    expect(result.current.phase).toBe('exploding');
    const sample = result.current.sampleOpening(clock + 300);
    expect(sample.phase).toBe('exploding');
    expect(sample.zoom).toBeCloseTo(easeOutCubic(900 / 1600), 10);
    expect(sample.zoom).toBeLessThan(1);
    tick(1200);
    expect(result.current.phase).toBe('done');
  });

  it('explodes at once on a scroll during the hold', () => {
    const { result } = mount();
    act(() => result.current.reportStatus('ready'));
    tick(2000);
    expect(result.current.phase).toBe('hold');
    scroll();
    expect(result.current.phase).toBe('exploding');
    tick(1200);
    expect(result.current.phase).toBe('done');
  });

  it('skips straight to done on scroll while waiting', () => {
    const { result } = mount();
    tick(500);
    scroll();
    expect(result.current.phase).toBe('done');
    expect(result.current.sampleOpening(clock)).toEqual({ phase: 'done', zoom: 1, explode: 1 });
  });

  it('removes the listener when the wait ends without a scroll', () => {
    const remove = vi.spyOn(window, 'removeEventListener');
    const { result } = mount();
    tick(4000);
    expect(result.current.phase).toBe('done');
    expect(remove.mock.calls.filter(([type]) => type === 'scroll')).toHaveLength(1);
  });

  it('registers no scroll listener under reduced motion', () => {
    const add = vi.spyOn(window, 'addEventListener');
    mount(true);
    expect(add.mock.calls.filter(([type]) => type === 'scroll')).toHaveLength(0);
  });
});

describe('useOpening sampling and lifecycle', () => {
  it('samples waiting, zoom, hold, the explosion curve and the finished opening from the wall clock', () => {
    const { result } = mount();
    expect(result.current.sampleOpening(0)).toEqual({ phase: 'waiting', zoom: 0, explode: 0 });
    act(() => result.current.reportStatus('ready'));
    const zoom = result.current.sampleOpening(800);
    expect(zoom).toEqual({ phase: 'zoom', zoom: easeOutCubic(0.5), explode: 0 });
    expect(result.current.sampleOpening(2000)).toEqual({ phase: 'hold', zoom: 1, explode: 0 });
    const sample = result.current.sampleOpening(2400 + 600);
    expect(sample.phase).toBe('exploding');
    expect(sample.zoom).toBe(1);
    expect(sample.explode).toBeCloseTo(easeOutCubic(0.5), 10);
    expect(result.current.sampleOpening(2400 + 1200)).toEqual({ phase: 'done', zoom: 1, explode: 1 });
  });

  it('switching to reduced motion ends the opening and switching back never replays', () => {
    const { result, rerender } = mount(false);
    rerender({ reducedMotion: true });
    expect(result.current.phase).toBe('done');
    rerender({ reducedMotion: false });
    expect(result.current.phase).toBe('done');
  });

  it('clears the timer and the listener on unmount', () => {
    const remove = vi.spyOn(window, 'removeEventListener');
    const { unmount } = mount();
    expect(vi.getTimerCount()).toBe(1);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
    expect(remove.mock.calls.filter(([type]) => type === 'scroll')).toHaveLength(1);
  });

  it('keeps exactly one timer and one live listener under StrictMode double mount', () => {
    const add = vi.spyOn(window, 'addEventListener');
    const remove = vi.spyOn(window, 'removeEventListener');
    const { result } = mount(false, true);
    act(() => result.current.reportStatus('ready'));
    tick(1600);
    expect(result.current.phase).toBe('hold');
    const adds = add.mock.calls.filter(([type]) => type === 'scroll').length;
    const removes = remove.mock.calls.filter(([type]) => type === 'scroll').length;
    expect(adds - removes).toBe(1);
    expect(vi.getTimerCount()).toBe(1);
  });
});
