import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useScrollProgress } from './useScrollProgress.js';

let frames;

function setDocument({ scrollY, scrollHeight, innerHeight }) {
  Object.defineProperty(window, 'scrollY', { value: scrollY, configurable: true });
  Object.defineProperty(window, 'innerHeight', { value: innerHeight, configurable: true });
  Object.defineProperty(document.documentElement, 'scrollHeight', { value: scrollHeight, configurable: true });
}

function flushFrames() {
  const pending = frames.splice(0);
  act(() => pending.forEach((callback) => callback(0)));
}

beforeEach(() => {
  frames = [];
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => frames.push(callback));
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
  setDocument({ scrollY: 0, scrollHeight: 3000, innerHeight: 1000 });
});

afterEach(() => vi.restoreAllMocks());

describe('useScrollProgress', () => {
  it('starts at 0 at the top of the document', () => {
    const { result } = renderHook(() => useScrollProgress());
    expect(result.current).toBe(0);
  });

  it('reports the scroll position over the scrollable range after a frame', () => {
    const { result } = renderHook(() => useScrollProgress());
    setDocument({ scrollY: 1000, scrollHeight: 3000, innerHeight: 1000 });
    act(() => void window.dispatchEvent(new Event('scroll')));
    flushFrames();
    expect(result.current).toBe(0.5);
  });

  it('reaches 1 at the bottom and never exceeds it', () => {
    const { result } = renderHook(() => useScrollProgress());
    setDocument({ scrollY: 2400, scrollHeight: 3000, innerHeight: 1000 });
    act(() => void window.dispatchEvent(new Event('scroll')));
    flushFrames();
    expect(result.current).toBe(1);
  });

  it('is 0 when the document does not scroll (jsdom, short page)', () => {
    setDocument({ scrollY: 0, scrollHeight: 0, innerHeight: 768 });
    const { result } = renderHook(() => useScrollProgress());
    expect(result.current).toBe(0);
  });

  it('throttles to one frame request for a burst of scroll events', () => {
    renderHook(() => useScrollProgress());
    frames.length = 0;
    act(() => {
      for (let i = 0; i < 5; i++) window.dispatchEvent(new Event('scroll'));
    });
    expect(frames).toHaveLength(1);
  });

  it('listens passively and removes its listeners and pending frame on unmount', () => {
    const add = vi.spyOn(window, 'addEventListener');
    const remove = vi.spyOn(window, 'removeEventListener');
    const { unmount } = renderHook(() => useScrollProgress());
    const scroll = add.mock.calls.find(([type]) => type === 'scroll');
    expect(scroll?.[2]).toEqual(expect.objectContaining({ passive: true }));
    act(() => void window.dispatchEvent(new Event('scroll')));
    unmount();
    expect(remove.mock.calls.map(([type]) => type)).toEqual(expect.arrayContaining(['scroll', 'resize']));
    expect(window.cancelAnimationFrame).toHaveBeenCalled();
  });
});
