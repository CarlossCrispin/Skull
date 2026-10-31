import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useCountdown } from './useCountdown.js';

const START = Date.UTC(2026, 9, 29, 6, 0, 0); // 29 Oct 2026 00:00 in Mexico City

describe('useCountdown', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(START);
  });
  afterEach(() => vi.useRealTimers());

  it('returns the text for the current time right away', () => {
    const { result } = renderHook(() => useCountdown());
    expect(result.current).toBe('04:00:00:00');
  });

  it('ticks once per second', () => {
    const { result } = renderHook(() => useCountdown());
    act(() => vi.advanceTimersByTime(1000));
    expect(result.current).toBe('03:23:59:59');
    act(() => vi.advanceTimersByTime(3000));
    expect(result.current).toBe('03:23:59:56');
  });

  it('switches to HOY when the festivity begins', () => {
    vi.setSystemTime(Date.UTC(2026, 10, 1, 5, 59, 59)); // 31 Oct 23:59:59 Mexico City
    const { result } = renderHook(() => useCountdown());
    expect(result.current).toBe('01:00:00:01');
    act(() => vi.advanceTimersByTime(1000));
    act(() => vi.advanceTimersByTime(1000));
    expect(result.current).toBe('HOY');
  });

  it('clears its interval on unmount', () => {
    const { unmount } = renderHook(() => useCountdown());
    expect(vi.getTimerCount()).toBe(1);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
