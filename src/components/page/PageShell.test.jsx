import { act, fireEvent, render } from '@testing-library/react';
import { useContext } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GlassContext } from '../glass/GlassContext.js';
import {
  installIntersectionObserverStub,
  installMatchMediaStub,
  installResizeObserverStub,
} from '../../test/stubs.js';

const hook = vi.hoisted(() => ({ calls: [], status: 'loading' }));

vi.mock('../skull-hero/useSkullScene.js', () => ({
  useSkullScene: (options) => {
    hook.calls.push(options);
    return hook.status;
  },
}));

const { PageShell } = await import('./PageShell.jsx');
const { SECTIONS } = await import('./sections.js');

const REDUCED = '(prefers-reduced-motion: reduce)';
const INTERACTIVE = 'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])';

function mount(reduced = false, sections) {
  const matchMedia = installMatchMediaStub({ [REDUCED]: reduced, '(min-width: 768px)': true });
  installIntersectionObserverStub();
  installResizeObserverStub();
  const view = render(<PageShell sections={sections} />);
  const main = view.container.querySelector('main');
  const children = [...main.children];
  const grid = children[0];
  const layer = children.at(-1);
  return { ...view, main, matchMedia, grid, layer, sections: children.slice(1, -1) };
}

beforeEach(() => {
  hook.calls = [];
  hook.status = 'loading';
  vi.useRealTimers();
});

describe('PageShell composition', () => {
  it('orders the decorative grid, the registry sections, then the 3D layer last in main', () => {
    const { container, main, grid, layer, sections } = mount();
    expect(container.querySelectorAll('main')).toHaveLength(1);
    expect(grid.hasAttribute('data-grid-overlay')).toBe(true);
    expect(sections.map((section) => section.tagName)).toEqual(Array(7).fill('SECTION'));
    expect(sections[0]?.querySelector('h1')).not.toBeNull();
    expect(layer.getAttribute('role')).toBe('img');
    expect(main.lastElementChild).toBe(layer);
  });

  it('registers the placeholder frame, frames 01 to 04, the assembly range, then frame 05, and no Block A', () => {
    const { container } = mount();
    expect(SECTIONS.map((entry) => entry.id)).toEqual(['frame-00', 'frame-01', 'frame-02', 'frame-03', 'frame-04', 'assembly-range', 'frame-05']);
    expect(container.querySelector('.skull-stage')).toBeNull();
  });

  it('renders frames 01 to 04 between the placeholder and the assembly range, one h2 each', () => {
    const { sections } = mount();
    expect(sections.slice(1, 5).map((section) => section.id)).toEqual(['frame-01', 'frame-02', 'frame-03', 'frame-04']);
    for (const section of sections.slice(1, 5)) expect(section.querySelectorAll('h2')).toHaveLength(1);
  });

  it('has no interactive elements except the Instagram link of the close frame', () => {
    const { container } = mount();
    const interactive = [...container.querySelectorAll(INTERACTIVE)];
    expect(interactive).toHaveLength(1);
    expect(interactive[0].getAttribute('href')).toBe('https://www.instagram.com/carloscrispin.cc/');
    expect(interactive[0].closest('#frame-05')).not.toBeNull();
  });

  it('has exactly one h1, inside the first section, and one image role after the text', () => {
    const { container, sections, layer } = mount();
    expect(container.querySelectorAll('h1')).toHaveLength(1);
    expect(sections[0]?.contains(container.querySelector('h1'))).toBe(true);
    expect(container.querySelectorAll('[role="img"]')).toHaveLength(1);
    const h1 = container.querySelector('h1');
    expect(h1.compareDocumentPosition(layer) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('keeps sections transparent so the cubes show through', () => {
    const { sections } = mount();
    expect(sections.length).toBeGreaterThan(0);
    for (const section of sections) expect(section.classList.contains('bg-bg')).toBe(false);
  });

  it('puts the decorative grid before the sections, fixed and inert', () => {
    const { grid, sections } = mount();
    expect(grid.getAttribute('aria-hidden')).toBe('true');
    expect(grid.classList.contains('fixed')).toBe(true);
    expect(sections[0]?.querySelector('[data-grid-overlay]')).toBeNull();
  });
});

describe('PageShell registry', () => {
  it('renders an appended stub after the sections and leaves the existing markup identical', () => {
    const base = mount();
    // useId values differ between mounts; the markup is otherwise compared byte for byte.
    const stable = (html) => html?.replace(/(id|aria-labelledby)="[^"]*"/g, '$1="#"');
    const baseHtml = [base.sections[0]?.outerHTML, base.sections[5]?.outerHTML, base.layer.outerHTML].map(stable);
    base.unmount();

    const stub = { id: 'altar', Component: () => <section data-stub="altar">altar</section> };
    const withStub = mount(false, [...SECTIONS, stub]);
    expect(withStub.sections).toHaveLength(8);
    expect(withStub.sections[7]?.getAttribute('data-stub')).toBe('altar');
    expect(withStub.sections[5]?.hasAttribute('data-assembly-range')).toBe(true);
    expect([withStub.sections[0]?.outerHTML, withStub.sections[5]?.outerHTML, withStub.layer.outerHTML].map(stable)).toEqual(baseHtml);
  });
});

describe('PageShell reduced motion', () => {
  it('passes the initial value to the layer', () => {
    const { layer } = mount(true);
    expect(hook.calls.every((call) => call.reducedMotion)).toBe(true);
    expect(layer.getAttribute('data-fade')).toBe('instant');
  });

  it('switches the layer live on a change event', () => {
    const { matchMedia, layer } = mount(false);
    expect(layer.getAttribute('data-fade')).toBe('fade');
    act(() => matchMedia.setMatches(REDUCED, true));
    expect(layer.getAttribute('data-fade')).toBe('instant');
  });
});

describe('PageShell native scroll', () => {
  it.each(['wheel', 'touchmove', 'keydown'])('never prevents default on %s', (type) => {
    const { main } = mount();
    const events = [];
    const spy = (event) => events.push(event);
    window.addEventListener(type, spy, { capture: true });
    if (type === 'wheel') fireEvent.wheel(main, { deltaY: 100 });
    if (type === 'touchmove') fireEvent.touchMove(main);
    if (type === 'keydown') for (const key of ['PageDown', ' ', 'ArrowDown']) fireEvent.keyDown(main, { key });
    window.removeEventListener(type, spy, { capture: true });
    expect(events.length).toBeGreaterThan(0);
    expect(events.every((event) => !event.defaultPrevented)).toBe(true);
  });
});

describe('PageShell opening wiring', () => {
  it('puts the empty assembly range right after frame 04 and the layer last', () => {
    const { sections, layer, main } = mount();
    expect(sections[5]?.hasAttribute('data-assembly-range')).toBe(true);
    expect(sections[5]?.textContent).toBe('');
    expect((sections[4]).compareDocumentPosition(sections[5]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(main.lastElementChild).toBe(layer);
  });

  it('gives every section revealGate false during the hold and true when the opening is done', () => {
    vi.useFakeTimers();
    const seen = [];
    const probe = { id: 'probe', Component: ({ revealGate }) => { seen.push(revealGate); return null; } };
    mount(false, [probe]);
    expect(seen.at(-1)).toBe(false);
    act(() => void vi.advanceTimersByTime(4000));
    expect(seen.at(-1)).toBe(true);
  });

  it('opens the gate at once under reduced motion', () => {
    const seen = [];
    const probe = { id: 'probe', Component: ({ revealGate }) => { seen.push(revealGate); return null; } };
    mount(true, [probe]);
    expect(seen.at(-1)).toBe(true);
  });

  it('shows no poster while waiting, then the faint backdrop once the wait is skipped with the scene still loading (G5)', () => {
    vi.useFakeTimers();
    const { layer } = mount();
    const poster = layer.querySelector('img');
    expect(poster).toHaveClass('invisible');
    act(() => void vi.advanceTimersByTime(3999));
    expect(poster).toHaveClass('invisible');
    act(() => void vi.advanceTimersByTime(1));
    expect(poster).toHaveClass('skull-backdrop');
  });

  it('a ready scene starts the zoom and keeps the poster hidden through the whole opening', () => {
    vi.useFakeTimers();
    hook.status = 'ready';
    const { layer } = mount();
    const poster = layer.querySelector('img');
    expect(poster).toHaveClass('invisible');
    expect(hook.calls.at(-1).readScrollFrame().opening?.phase).toBe('zoom');
    act(() => void vi.advanceTimersByTime(2400));
    expect(poster).toHaveClass('invisible');
    act(() => void vi.advanceTimersByTime(1200));
    expect(poster).toHaveClass('invisible');
    expect(poster).not.toHaveClass('skull-hold', 'skull-full', 'skull-backdrop');
  });

  it('hands the scene hook a scroll-frame reader that samples the opening', () => {
    mount();
    expect(hook.calls.at(-1).readScrollFrame().opening).toEqual({ phase: 'waiting', zoom: 0, explode: 0 });
  });
});

describe('PageShell glass wiring', () => {
  afterEach(() => vi.unstubAllGlobals());

  function mountProbe() {
    const seen = [];
    const probe = {
      id: 'probe',
      Component: () => {
        seen.push(useContext(GlassContext));
        return null;
      },
    };
    const view = mount(false, [probe]);
    return { ...view, seen };
  }

  it('provides one stable mirror and the scene status through GlassContext', () => {
    const { seen } = mountProbe();
    expect(seen.at(-1).mirror).not.toBeNull();
    expect(seen.at(-1).sceneStatus).toBe('loading');
    const mirrors = new Set(seen.map((value) => value.mirror));
    expect(mirrors.size).toBe(1);
  });

  it.each(['ready', 'lost', 'failed'])('tracks the scene status reported by the layer (%s)', (status) => {
    hook.status = status;
    const { seen } = mountProbe();
    expect(seen.at(-1).sceneStatus).toBe(status);
  });

  it('hands the scene hook a present callback that publishes to the provided mirror', () => {
    const { seen } = mountProbe();
    const sink = vi.fn();
    seen.at(-1).mirror.subscribe(sink);
    const canvas = {};
    hook.calls.at(-1).onPresent(canvas, 5);
    expect(sink).toHaveBeenCalledWith(canvas, 5);
  });
});
