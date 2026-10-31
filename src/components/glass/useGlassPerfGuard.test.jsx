import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useGlassPerfGuard } from './useGlassPerfGuard.js';

// A manual frame clock: rAF callbacks queue up and `frame(dt)` runs the pending ones one tick later.
let queue;
let nextId;
let clock;
let cancelled;

function frame(dt) {
  clock += dt;
  const pending = [...queue.entries()];
  queue.clear();
  act(() => {
    for (const [, callback] of pending) callback(clock);
  });
}

const scroll = () => act(() => void window.dispatchEvent(new Event('scroll')));

/** Runs `count` frames at `dt` ms, scrolling first so sampling is armed and stays armed. */
function scrollFrames(count, dt) {
  for (let index = 0; index < count; index += 1) {
    scroll();
    frame(dt);
  }
}

beforeEach(() => {
  queue = new Map();
  nextId = 1;
  clock = 1000;
  cancelled = [];
  vi.spyOn(performance, 'now').mockImplementation(() => clock);
  vi.stubGlobal('requestAnimationFrame', (callback) => {
    const id = nextId++;
    queue.set(id, callback);
    return id;
  });
  vi.stubGlobal('cancelAnimationFrame', (id) => {
    cancelled.push(id);
    queue.delete(id);
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('useGlassPerfGuard sampling window', () => {
  it('does not sample frames before any scroll', () => {
    renderHook(() => useGlassPerfGuard(true));
    expect(queue.size).toBe(0);
  });

  it('starts sampling on a scroll event and stops one second after the last one', () => {
    renderHook(() => useGlassPerfGuard(true));
    scroll();
    expect(queue.size).toBe(1);
    frame(16);
    expect(queue.size).toBe(1);
    frame(900);
    expect(queue.size).toBe(1);
    frame(200);
    expect(queue.size).toBe(0);
  });

  it('does not sample when inactive and registers no scroll listener', () => {
    const add = vi.spyOn(window, 'addEventListener');
    renderHook(() => useGlassPerfGuard(false));
    scroll();
    expect(queue.size).toBe(0);
    expect(add.mock.calls.some(([type]) => type === 'scroll')).toBe(false);
  });
});

describe('useGlassPerfGuard degradation', () => {
  it('degrades after 30 intervals whose median exceeds 25 ms', () => {
    const { result } = renderHook(() => useGlassPerfGuard(true));
    scrollFrames(1, 16);
    scrollFrames(29, 40);
    expect(result.current).toBe(false);
    scrollFrames(1, 40);
    expect(result.current).toBe(true);
  });

  it('stays live with 60 fps frames', () => {
    const { result } = renderHook(() => useGlassPerfGuard(true));
    scrollFrames(80, 16.7);
    expect(result.current).toBe(false);
  });

  it('stays live with fewer than 30 slow intervals', () => {
    const { result } = renderHook(() => useGlassPerfGuard(true));
    scrollFrames(1, 16);
    scrollFrames(29, 60);
    expect(result.current).toBe(false);
  });

  it('ignores intervals of 200 ms or more', () => {
    const { result } = renderHook(() => useGlassPerfGuard(true));
    scrollFrames(1, 16);
    scrollFrames(20, 300);
    scrollFrames(20, 16);
    expect(result.current).toBe(false);
  });

  it('does not re-promote after degrading, even with fast frames afterwards', () => {
    const { result, rerender } = renderHook(({ active }) => useGlassPerfGuard(active), {
      initialProps: { active: true },
    });
    scrollFrames(1, 16);
    scrollFrames(30, 40);
    expect(result.current).toBe(true);
    rerender({ active: false });
    rerender({ active: true });
    scrollFrames(60, 10);
    expect(result.current).toBe(true);
  });
});

describe('useGlassPerfGuard cleanup', () => {
  it('removes the scroll listener and cancels the pending frame on unmount', () => {
    const remove = vi.spyOn(window, 'removeEventListener');
    const { unmount } = renderHook(() => useGlassPerfGuard(true));
    scroll();
    const pending = [...queue.keys()];
    expect(pending).toHaveLength(1);
    unmount();
    expect(cancelled).toEqual(pending);
    expect(remove.mock.calls.some(([type]) => type === 'scroll')).toBe(true);
    scroll();
    expect(queue.size).toBe(0);
  });

  it('stops sampling when it becomes inactive', () => {
    const { rerender } = renderHook(({ active }) => useGlassPerfGuard(active), { initialProps: { active: true } });
    scroll();
    expect(queue.size).toBe(1);
    rerender({ active: false });
    expect(queue.size).toBe(0);
    scroll();
    expect(queue.size).toBe(0);
  });
});
