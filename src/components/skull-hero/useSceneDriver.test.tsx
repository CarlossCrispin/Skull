import { act, renderHook } from '@testing-library/react';
import type { RefObject } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { assemblyTarget } from '../../lib/motion/assembly.ts';
import { ASSEMBLY_RANGE_ATTR } from '../../lib/layout/anchors.ts';

// Retired anchor names: the driver must never look them up again.
const TEXT_COLUMN_ATTR = 'data-text-column';
const TEXT_TITLE_ATTR = 'data-text-title';
import { OPENING_DONE, type OpeningSample } from '../../lib/motion/opening.ts';
import { installResizeObserverStub } from '../../test/stubs.ts';
import { useSceneDriver, type DriverOptions, type DriverScene } from './useSceneDriver.ts';

function fakeScene() {
  return {
    setPaused: vi.fn<DriverScene['setPaused']>(),
    resize: vi.fn<DriverScene['resize']>(),
    invalidate: vi.fn<DriverScene['invalidate']>(),
  };
}

function setViewport(values: { scrollHeight?: number; innerHeight?: number; scrollY?: number }): void {
  if (values.scrollHeight !== undefined) {
    Object.defineProperty(document.documentElement, 'scrollHeight', { configurable: true, value: values.scrollHeight });
  }
  if (values.innerHeight !== undefined) {
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: values.innerHeight });
  }
  if (values.scrollY !== undefined) {
    Object.defineProperty(window, 'scrollY', { configurable: true, value: values.scrollY, writable: true });
  }
}

function setVisibility(state: 'visible' | 'hidden'): void {
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => state });
  document.dispatchEvent(new Event('visibilitychange'));
}

function column(rect: { left: number; right: number; top: number; bottom: number }) {
  const element = document.createElement('div');
  element.setAttribute(TEXT_COLUMN_ATTR, '');
  const spy = vi.fn(() => ({ ...rect, width: rect.right - rect.left, height: rect.bottom - rect.top }) as DOMRect);
  element.getBoundingClientRect = spy;
  document.body.appendChild(element);
  return { element, spy };
}

afterEach(() => {
  document.body.replaceChildren();
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' });
  setViewport({ scrollHeight: 0, innerHeight: 768, scrollY: 0 });
});

function anchor(attr: string, rect: { left: number; right: number; top: number; bottom: number }) {
  const element = document.createElement('div');
  element.setAttribute(attr, '');
  const spy = vi.fn(() => ({ ...rect, width: rect.right - rect.left, height: rect.bottom - rect.top }) as DOMRect);
  element.getBoundingClientRect = spy;
  document.body.appendChild(element);
  return { element, spy };
}

function mount(scene: DriverScene | null, options?: DriverOptions) {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const ref: RefObject<HTMLDivElement | null> = { current: host };
  const renders = { count: 0 };
  const view = renderHook(
    ({ s }) => {
      renders.count += 1;
      return useSceneDriver(ref, s, options);
    },
    { initialProps: { s: scene } },
  );
  return { host, renders, ...view };
}

describe('useSceneDriver', () => {
  it('pauses with reason hidden on visibilitychange and resumes when visible again', () => {
    installResizeObserverStub();
    const scene = fakeScene();
    mount(scene);
    setVisibility('hidden');
    expect(scene.setPaused).toHaveBeenLastCalledWith('hidden', true);
    setVisibility('visible');
    expect(scene.setPaused).toHaveBeenLastCalledWith('hidden', false);
  });

  it('applies an already hidden document to a scene that arrives late', () => {
    installResizeObserverStub();
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
    const scene = fakeScene();
    const { rerender } = mount(null);
    rerender({ s: scene });
    expect(scene.setPaused).toHaveBeenCalledWith('hidden', true);
  });

  it('registers a passive scroll listener whose only work is scene.invalidate()', () => {
    installResizeObserverStub();
    const add = vi.spyOn(window, 'addEventListener');
    const scene = fakeScene();
    const { spy } = column({ left: 0, right: 100, top: 0, bottom: 100 });
    mount(scene);
    const scroll = add.mock.calls.find((call) => call[0] === 'scroll');
    expect(scroll?.[2]).toEqual({ passive: true });
    add.mockRestore();
    spy.mockClear();
    window.dispatchEvent(new Event('scroll'));
    window.dispatchEvent(new Event('scroll'));
    expect(scene.invalidate).toHaveBeenCalledTimes(2);
    expect(scene.resize).not.toHaveBeenCalled();
    expect(spy).not.toHaveBeenCalled();
  });

  it('survives scroll events before any scene exists', () => {
    installResizeObserverStub();
    mount(null);
    expect(() => window.dispatchEvent(new Event('scroll'))).not.toThrow();
  });

  it('forwards host sizes through shouldResizeRenderer (URL-bar height change ignored)', () => {
    const ro = installResizeObserverStub();
    const scene = fakeScene();
    const { host } = mount(scene);
    ro.trigger(host, { width: 1440, height: 900 });
    expect(scene.resize).toHaveBeenLastCalledWith(1440, 900);
    scene.resize.mockClear();
    ro.trigger(host, { width: 1440, height: 800 });
    expect(scene.resize).not.toHaveBeenCalled();
    ro.trigger(host, { width: 390, height: 844 });
    expect(scene.resize).toHaveBeenLastCalledWith(390, 844);
    expect(scene.resize).toHaveBeenCalledTimes(1);
  });

  it('readScrollFrame maps scrollY to the assembly target with end = maxScroll when there is no spacer', () => {
    installResizeObserverStub();
    setViewport({ scrollHeight: 5000, innerHeight: 1000, scrollY: 0 });
    const { result } = mount(fakeScene());
    const metrics = { start: 0, end: 4000, maxScroll: 4000 };
    for (const scrollY of [0, 1000, 2000, 3000, 3999, 4000]) {
      setViewport({ scrollY });
      expect(result.current.readScrollFrame().target).toBe(assemblyTarget(scrollY, metrics));
    }
    setViewport({ scrollY: 2000 });
    expect(result.current.readScrollFrame().target).toBe(0.5);
    setViewport({ scrollY: 4000 });
    expect(result.current.readScrollFrame().target).toBe(1);
  });

  it('never queries the text column or the title and returns exactly { target, opening }', () => {
    installResizeObserverStub();
    setViewport({ scrollHeight: 5000, innerHeight: 1000, scrollY: 50 });
    const columnAnchor = column({ left: 432, right: 1008, top: 100, bottom: 700 });
    const titleAnchor = anchor(TEXT_TITLE_ATTR, { left: 40, right: 1400, top: 60, bottom: 400 });
    const { result } = mount(fakeScene());
    setViewport({ scrollY: 2000 });
    const frame = result.current.readScrollFrame();
    expect(Object.keys(frame).sort()).toEqual(['opening', 'target']);
    expect(frame.target).toBe(0.5);
    expect(frame.opening).toBe(OPENING_DONE);
    expect(columnAnchor.spy).not.toHaveBeenCalled();
    expect(titleAnchor.spy).not.toHaveBeenCalled();
  });

  describe('assembly range and opening', () => {
    it('measures start = range top and end = min(range top + height - innerHeight, maxScroll)', () => {
      installResizeObserverStub();
      // Range at R = 3000 with height 3V (V = 1000): start R, end R + 2V = 5000 (below maxScroll 7000).
      setViewport({ scrollHeight: 8000, innerHeight: 1000, scrollY: 0 });
      anchor(ASSEMBLY_RANGE_ATTR, { left: 0, right: 1000, top: 3000, bottom: 6000 });
      const { result } = mount(fakeScene());
      const metrics = { start: 3000, end: 5000, maxScroll: 7000 };
      for (const scrollY of [0, 2500, 3000, 3500, 4000, 5000, 6000, 7000]) {
        setViewport({ scrollY });
        expect(result.current.readScrollFrame().target).toBe(assemblyTarget(scrollY, metrics));
      }
      setViewport({ scrollY: 4000 });
      expect(result.current.readScrollFrame().target).toBe(0.5);
      setViewport({ scrollY: 2999 });
      expect(result.current.readScrollFrame().target).toBe(0);
    });

    it('caps end at maxScroll and keeps target 1 at max scroll when the range is short of the page end', () => {
      installResizeObserverStub();
      setViewport({ scrollHeight: 6500, innerHeight: 1000, scrollY: 0 });
      anchor(ASSEMBLY_RANGE_ATTR, { left: 0, right: 1000, top: 4000, bottom: 7000 });
      const { result } = mount(fakeScene());
      // end = min(4000 + 3000 - 1000, 5500) = 5500.
      setViewport({ scrollY: 4750 });
      expect(result.current.readScrollFrame().target).toBe(0.5);
      setViewport({ scrollY: 5500 });
      expect(result.current.readScrollFrame().target).toBe(1);
    });

    it('measures the range in document coordinates when the page is already scrolled', () => {
      installResizeObserverStub();
      setViewport({ scrollHeight: 8000, innerHeight: 1000, scrollY: 500 });
      anchor(ASSEMBLY_RANGE_ATTR, { left: 0, right: 1000, top: 2500, bottom: 5500 });
      const { result } = mount(fakeScene());
      setViewport({ scrollY: 3000 });
      expect(result.current.readScrollFrame().target).toBe(0);
      setViewport({ scrollY: 4000 });
      expect(result.current.readScrollFrame().target).toBe(0.5);
    });

    it('samples the opening with the injected wall clock and defaults to done', () => {
      installResizeObserverStub();
      const hold: OpeningSample = { phase: 'hold', zoom: 1, explode: 0 };
      const sampleOpening = vi.fn((_nowMs: number): OpeningSample => hold);
      let clock = 1234;
      const { result } = mount(fakeScene(), { sampleOpening, now: () => clock });
      expect(result.current.readScrollFrame().opening).toBe(hold);
      expect(sampleOpening).toHaveBeenLastCalledWith(1234);
      clock = 5678;
      result.current.readScrollFrame();
      expect(sampleOpening).toHaveBeenLastCalledWith(5678);

      const fallback = mount(fakeScene());
      expect(fallback.result.current.readScrollFrame().opening).toEqual(OPENING_DONE);
    });

    it('flips inAssemblyRange only when scrollY crosses the range start, with no other re-render', () => {
      installResizeObserverStub();
      setViewport({ scrollHeight: 8000, innerHeight: 1000, scrollY: 0 });
      anchor(ASSEMBLY_RANGE_ATTR, { left: 0, right: 1000, top: 3000, bottom: 6000 });
      const { result, renders } = mount(fakeScene());
      expect(result.current.inAssemblyRange).toBe(false);
      const scrollTo = (scrollY: number): void => {
        setViewport({ scrollY });
        act(() => {
          window.dispatchEvent(new Event('scroll'));
        });
      };
      const base = renders.count;
      scrollTo(1000);
      scrollTo(2999);
      expect(renders.count).toBe(base);
      expect(result.current.inAssemblyRange).toBe(false);
      scrollTo(3000);
      expect(result.current.inAssemblyRange).toBe(true);
      expect(renders.count).toBe(base + 1);
      scrollTo(4000);
      scrollTo(7000);
      expect(renders.count).toBe(base + 1);
      scrollTo(2000);
      expect(result.current.inAssemblyRange).toBe(false);
      expect(renders.count).toBe(base + 2);
    });

    it('starts inside the range when the page is restored past the range start', () => {
      installResizeObserverStub();
      setViewport({ scrollHeight: 8000, innerHeight: 1000, scrollY: 3500 });
      anchor(ASSEMBLY_RANGE_ATTR, { left: 0, right: 1000, top: -500, bottom: 2500 });
      const { result } = mount(fakeScene());
      expect(result.current.inAssemblyRange).toBe(true);
    });
  });

  it('refreshes the cached metrics on document ResizeObserver and window resize, then invalidates', () => {
    const ro = installResizeObserverStub();
    setViewport({ scrollHeight: 3000, innerHeight: 1000, scrollY: 0 });
    const scene = fakeScene();
    const { result } = mount(scene);
    setViewport({ scrollY: 1000 });
    expect(result.current.readScrollFrame().target).toBe(0.5);

    setViewport({ scrollHeight: 5000 });
    ro.trigger(document.documentElement, { width: 1000, height: 5000 });
    expect(result.current.readScrollFrame().target).toBe(0.25);
    expect(scene.invalidate).toHaveBeenCalledTimes(1);

    setViewport({ scrollHeight: 2000, innerHeight: 1000 });
    window.dispatchEvent(new Event('resize'));
    expect(result.current.readScrollFrame().target).toBe(1);
    expect(scene.invalidate).toHaveBeenCalledTimes(2);
  });

  it('keeps readScrollFrame referentially stable and usable before any scene exists', () => {
    installResizeObserverStub();
    const { result, rerender } = mount(null);
    const first = result.current.readScrollFrame;
    rerender({ s: fakeScene() });
    expect(result.current.readScrollFrame).toBe(first);
    expect(first()).toEqual({
      target: assemblyTarget(0, { start: 0, end: 0, maxScroll: 0 }),
      opening: OPENING_DONE,
    });
  });

  it('disconnects observers and removes every listener on cleanup', () => {
    const ro = installResizeObserverStub();
    const remove = vi.spyOn(window, 'removeEventListener');
    const scene = fakeScene();
    const { host, unmount } = mount(scene);
    unmount();
    expect(remove.mock.calls.map((call) => call[0]).sort()).toEqual(['resize', 'scroll']);
    remove.mockRestore();
    scene.invalidate.mockClear();
    ro.trigger(host, { width: 10, height: 10 });
    ro.trigger(document.documentElement, { width: 10, height: 10 });
    window.dispatchEvent(new Event('scroll'));
    window.dispatchEvent(new Event('resize'));
    setVisibility('hidden');
    expect(scene.resize).not.toHaveBeenCalled();
    expect(scene.invalidate).not.toHaveBeenCalled();
    expect(scene.setPaused).not.toHaveBeenCalled();
  });
});
