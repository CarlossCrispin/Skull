import { act, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CARD_HEIGHT_PX, CARD_WIDTH_PX } from '../../lib/hud/annotationSlots.js';
import { SkullAnnotations } from './SkullAnnotations.jsx';

const OPEN = { reducedMotion: false, revealGate: true, skullAssembled: true };
const CLOSED = { reducedMotion: false, revealGate: false, skullAssembled: true };
const GONE = { reducedMotion: false, revealGate: true, skullAssembled: false };
const REDUCED = { reducedMotion: true, revealGate: false, skullAssembled: true };

const ROLL = () => 0.3;

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-11-01T18:30:05Z'));
});
afterEach(() => vi.useRealTimers());

function mount(props = OPEN, random = ROLL) {
  const view = render(<SkullAnnotations {...props} random={random} />);
  return { ...view, root: view.container.firstElementChild };
}

const rectOf = (left, top, width, height) => ({ left, top, width, height, right: left + width, bottom: top + height, x: left, y: top });
const cardRect = (card) => {
  const left = Number.parseFloat(card.style.left);
  const top = Number.parseFloat(card.style.top);
  return { left, top, right: left + CARD_WIDTH_PX, bottom: top + CARD_HEIGHT_PX };
};
const hits = (a, b) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;

describe('SkullAnnotations content', () => {
  it('shows the four approved cards with their labels and values', () => {
    const { root } = mount();
    expect(root.querySelectorAll('[data-annotation]')).toHaveLength(4);
    for (const text of [
      '//COORD_',
      '19.4326° N · 99.1332° O',
      '//DÍA_DE_MUERTOS',
      '01–02.NOV',
      '//SYS_TIME',
      '//OPERADOR_',
      'CarlosCrispin',
    ]) {
      expect(within(root).getByText(text)).toBeInTheDocument();
    }
  });

  it('renders the live Mexico City time in a time element that is not announced every second', () => {
    const { root } = mount();
    const time = root.querySelector('time');
    expect(time).toHaveTextContent('01.11.2026 · 12:30:05');
    expect(time).toHaveAttribute('dateTime', '2026-11-01T18:30:05.000Z');
    expect(time).toHaveAttribute('aria-live', 'off');
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(time).toHaveTextContent('01.11.2026 · 12:30:07');
  });

  it('is hidden below md and does not intercept pointer events', () => {
    const { root } = mount();
    expect(root).toHaveClass('hidden', 'md:block', 'pointer-events-none');
  });

  it('adds no heading, button or link', () => {
    const { container } = mount();
    expect(container.querySelector('h1, h2, h3, button, a')).toBeNull();
    expect(screen.queryByRole('heading')).toBeNull();
  });
});

describe('SkullAnnotations look', () => {
  it('frames each card with the chamfer frame on the dense frost, square and without effects', () => {
    const { root } = mount();
    for (const card of root.querySelectorAll('[data-annotation]')) {
      expect(card.querySelectorAll('svg[data-glass-frame]')).toHaveLength(1);
      expect(card.querySelector('.glass-frost')).not.toBeNull();
      expect(card.querySelector('.label-mono')).not.toBeNull();
    }
    expect(root.outerHTML).not.toMatch(/rounded|shadow|blur|gradient/);
  });

  it('uses at most one 4 px signal square per card', () => {
    const { root } = mount();
    for (const card of root.querySelectorAll('[data-annotation]')) {
      const signal = card.querySelectorAll('.bg-signal');
      expect(signal).toHaveLength(1);
      expect(signal[0]).toHaveClass('size-1');
    }
  });

  it('points each card at the skull with an aria-hidden leader on the inner side', () => {
    const { root } = mount();
    for (const card of root.querySelectorAll('[data-annotation]')) {
      const leader = card.querySelector('[data-leader]');
      expect(leader).toHaveAttribute('aria-hidden', 'true');
      expect(leader).toHaveClass(card.getAttribute('data-side') === 'left' ? 'left-full' : 'right-full');
    }
  });

  it('clips the frost to the chamfer so no corner shows outside the cut', () => {
    const { root } = mount();
    for (const frost of root.querySelectorAll('.glass-frost')) expect(frost).toHaveClass('chamfer-clip');
  });
});

describe('SkullAnnotations placement', () => {
  afterEach(() => vi.restoreAllMocks());

  function mountMeasured({ h1 = rectOf(64, 320, 1152, 128), random = ROLL } = {}) {
    const state = { h1 };
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function rect() {
      if (this.hasAttribute('data-hud-avoid')) return state.h1;
      if (this.hasAttribute('data-annotations')) return rectOf(0, 0, 1280, 713);
      return rectOf(0, 0, 0, 0);
    });
    const obstacle = document.createElement('div');
    obstacle.setAttribute('data-hud-avoid', '');
    document.body.append(obstacle);
    const view = render(<SkullAnnotations {...OPEN} random={random} />);
    const root = view.container.firstElementChild;
    return { ...view, root, state, obstacle };
  }

  afterEach(() => document.querySelectorAll('body > [data-hud-avoid]').forEach((el) => el.remove()));

  it('measures the layer and the avoid-marked obstacles on mount', () => {
    const { root } = mountMeasured();
    expect(root).toHaveAttribute('data-annotations');
    expect(Element.prototype.getBoundingClientRect).toHaveBeenCalled();
  });

  it('keeps every card clear of the measured H1 band and of the other cards', () => {
    const { root, state } = mountMeasured();
    const rects = [...root.querySelectorAll('[data-annotation]')].map(cardRect);
    expect(rects).toHaveLength(4);
    rects.forEach((rect, i) => {
      expect(hits(rect, { left: 64 - 12, top: state.h1.top - 12, right: 1216 + 12, bottom: state.h1.bottom + 12 })).toBe(false);
      rects.slice(i + 1).forEach((other) => expect(hits(rect, other)).toBe(false));
    });
  });

  it('renders fewer cards, keeping SYS_TIME and OPERADOR first, when the space runs out', () => {
    const { root } = mountMeasured({ h1: rectOf(0, 0, 640, 713) });
    const labels = [...root.querySelectorAll('[data-annotation] p.label-mono')].map((el) => el.textContent);
    expect(labels.length).toBeLessThan(4);
    expect(labels.length).toBeGreaterThan(1);
    expect(labels).toContain('//SYS_TIME');
    expect(labels).toContain('//OPERADOR_');
  });

  it('re-places the cards when the window is resized, without calling random again', () => {
    const random = vi.fn(() => 0.3);
    const { root, state } = mountMeasured({ h1: rectOf(0, 900, 10, 10), random });
    const calls = random.mock.calls.length;
    const before = [...root.querySelectorAll('[data-annotation]')].map((card) => card.style.top + card.style.left);
    state.h1 = rectOf(64, 150, 1152, 520);
    act(() => {
      window.dispatchEvent(new Event('resize'));
      vi.advanceTimersByTime(100);
    });
    const cards = [...root.querySelectorAll('[data-annotation]')];
    expect(cards.map((card) => card.style.top + card.style.left)).not.toEqual(before);
    for (const card of cards) expect(hits(cardRect(card), { left: 52, top: 138, right: 1228, bottom: 682 })).toBe(false);
    expect(random.mock.calls.length).toBe(calls);
  });

  it('keeps the positions across re-renders (only a resize recomputes)', () => {
    const random = vi.fn(() => 0.4);
    const { root, rerender } = mount(OPEN, random);
    const before = [...root.querySelectorAll('[data-annotation]')].map((card) => card.getAttribute('data-annotation'));
    const calls = random.mock.calls.length;
    rerender(<SkullAnnotations {...OPEN} random={random} />);
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    const after = [...root.querySelectorAll('[data-annotation]')].map((card) => card.getAttribute('data-annotation'));
    expect(after).toEqual(before);
    expect(random.mock.calls.length).toBe(calls);
  });

  it('removes the resize listener on unmount', () => {
    const remove = vi.spyOn(window, 'removeEventListener');
    const { unmount } = mount();
    unmount();
    expect(remove).toHaveBeenCalledWith('resize', expect.any(Function));
  });
});

describe('SkullAnnotations motion', () => {
  it('stays hidden (but laid out) before the gate opens', () => {
    const { root } = mount(CLOSED);
    for (const card of root.querySelectorAll('[data-annotation]')) {
      expect(card).toHaveClass('invisible');
      expect(card.className).not.toMatch(/hud-/);
    }
  });

  it('scales the cards in after the nodes, 120 ms apart', () => {
    const { root } = mount(OPEN);
    const cards = [...root.querySelectorAll('[data-annotation]')];
    expect(cards.map((card) => card.style.animationDelay)).toEqual(['1600ms', '1720ms', '1840ms', '1960ms']);
    for (const card of cards) expect(card).toHaveClass('hud-scale-in');
  });

  it('fades the whole layer out and hides it from assistive tech once the skull is no longer assembled', () => {
    const { root } = mount(GONE);
    expect(root).toHaveClass('hud-fade-out');
    expect(root).toHaveAttribute('aria-hidden', 'true');
  });

  it('does not fade while the skull is assembled', () => {
    const { root } = mount(OPEN);
    expect(root).not.toHaveClass('hud-fade-out');
    expect(root).not.toHaveAttribute('aria-hidden');
  });

  it('is visible without animation under reduced motion', () => {
    const { root } = mount(REDUCED);
    expect(root.querySelector('.invisible')).toBeNull();
    expect(root.querySelectorAll('[class*="hud-"]')).toHaveLength(0);
  });
});
