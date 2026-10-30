import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CLOCK_PLACEHOLDER, formatMexicoCityTime, useClock } from './useClock.js';

function setHidden(hidden) {
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden });
  document.dispatchEvent(new Event('visibilitychange'));
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-11-01T18:30:05Z'));
});

afterEach(() => {
  setHidden(false);
  delete document.hidden;
  vi.useRealTimers();
});

describe('formatMexicoCityTime', () => {
  it('formats DD.MM.YYYY · HH:MM:SS in Mexico City time (UTC-6, no DST)', () => {
    expect(formatMexicoCityTime(new Date('2026-11-01T18:30:05Z'))).toBe('01.11.2026 · 12:30:05');
    expect(formatMexicoCityTime(new Date('2026-07-15T06:00:00Z'))).toBe('15.07.2026 · 00:00:00');
  });

  it('crosses the date boundary with the Mexico City offset, not UTC', () => {
    expect(formatMexicoCityTime(new Date('2026-11-02T05:59:59Z'))).toBe('01.11.2026 · 23:59:59');
    expect(formatMexicoCityTime(new Date('2026-11-02T06:00:00Z'))).toBe('02.11.2026 · 00:00:00');
  });
});

describe('useClock', () => {
  it('exposes a stable placeholder, then the live text after mount', () => {
    expect(CLOCK_PLACEHOLDER).toBe('--.--.---- · --:--:--');
    const { result } = renderHook(() => useClock());
    expect(result.current.text).toBe('01.11.2026 · 12:30:05');
    expect(result.current.iso).toBe('2026-11-01T18:30:05.000Z');
  });

  it('renders the placeholder on the first render, before any effect', () => {
    const seen = [];
    renderHook(() => {
      const clock = useClock();
      seen.push(clock.text);
      return clock;
    });
    expect(seen[0]).toBe(CLOCK_PLACEHOLDER);
  });

  it('ticks every second', () => {
    const { result } = renderHook(() => useClock());
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(result.current.text).toBe('01.11.2026 · 12:30:08');
  });

  it('clears its interval on unmount', () => {
    const { unmount } = renderHook(() => useClock());
    expect(vi.getTimerCount()).toBe(1);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('pauses while the document is hidden and catches up when visible again', () => {
    const { result } = renderHook(() => useClock());
    act(() => setHidden(true));
    expect(vi.getTimerCount()).toBe(0);
    act(() => {
      vi.advanceTimersByTime(10_000);
    });
    expect(result.current.text).toBe('01.11.2026 · 12:30:05');
    act(() => setHidden(false));
    expect(result.current.text).toBe('01.11.2026 · 12:30:15');
    expect(vi.getTimerCount()).toBe(1);
  });
});
