import { describe, expect, it } from 'vitest';
import {
  installIntersectionObserverStub,
  installMatchMediaStub,
  installResizeObserverStub,
} from './stubs.ts';

describe('matchMedia stub', () => {
  it('reports the configured initial match state', () => {
    const media = installMatchMediaStub({ '(prefers-reduced-motion: reduce)': true });
    expect(window.matchMedia('(prefers-reduced-motion: reduce)').matches).toBe(true);
    expect(window.matchMedia('(min-width: 768px)').matches).toBe(false);
    media.restore();
  });

  it('delivers change events to listeners and updates matches', () => {
    const media = installMatchMediaStub();
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const seen: boolean[] = [];
    query.addEventListener('change', (event) => seen.push(event.matches));

    media.setMatches('(prefers-reduced-motion: reduce)', true);
    media.setMatches('(prefers-reduced-motion: reduce)', false);

    expect(seen).toEqual([true, false]);
    expect(query.matches).toBe(false);
    media.restore();
  });

  it('stops delivering events to removed listeners', () => {
    const media = installMatchMediaStub();
    const query = window.matchMedia('(min-width: 768px)');
    const calls: boolean[] = [];
    const listener = (event: MediaQueryListEvent): void => {
      calls.push(event.matches);
    };
    query.addEventListener('change', listener);
    media.setMatches('(min-width: 768px)', true);
    query.removeEventListener('change', listener);
    media.setMatches('(min-width: 768px)', false);

    expect(calls).toEqual([true]);
    expect(media.listenerCount('(min-width: 768px)')).toBe(0);
    media.restore();
  });
});

describe('IntersectionObserver stub', () => {
  it('delivers triggered entries until the target is unobserved or disconnected', () => {
    const io = installIntersectionObserverStub();
    const received: number[] = [];
    const target = document.createElement('div');
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) received.push(entry.intersectionRatio);
    });
    observer.observe(target);

    io.trigger(target, 0.5);
    observer.unobserve(target);
    io.trigger(target, 0.9);

    expect(received).toEqual([0.5]);
    expect(io.observed()).toEqual([]);
    io.restore();
  });

  it('marks entries intersecting when the ratio is positive', () => {
    const io = installIntersectionObserverStub();
    const flags: boolean[] = [];
    const target = document.createElement('div');
    new IntersectionObserver((entries) => {
      for (const entry of entries) flags.push(entry.isIntersecting);
    }).observe(target);

    io.trigger(target, 0);
    io.trigger(target, 0.2);

    expect(flags).toEqual([false, true]);
    io.restore();
  });
});

describe('ResizeObserver stub', () => {
  it('delivers triggered sizes to observers of the target and stops after disconnect', () => {
    const ro = installResizeObserverStub();
    const sizes: number[] = [];
    const target = document.createElement('div');
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) sizes.push(entry.contentRect.width);
    });
    observer.observe(target);

    ro.trigger(target, { width: 320, height: 200 });
    observer.disconnect();
    ro.trigger(target, { width: 640, height: 200 });

    expect(sizes).toEqual([320]);
    ro.restore();
  });
});
