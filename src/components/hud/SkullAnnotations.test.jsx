import { act, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ANNOTATION_SLOTS } from '../../lib/hud/annotationSlots.js';
import { SkullAnnotations } from './SkullAnnotations.jsx';

const OPEN = { reducedMotion: false, revealGate: true, skullAssembled: true };
const CLOSED = { reducedMotion: false, revealGate: false, skullAssembled: true };
const GONE = { reducedMotion: false, revealGate: true, skullAssembled: false };
const REDUCED = { reducedMotion: true, revealGate: false, skullAssembled: true };

// random() = 0 always picks the first four slots in table order: L1, L2, L3, L4.
const FIRST_FOUR = () => 0;

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-11-01T18:30:05Z'));
});
afterEach(() => vi.useRealTimers());

function mount(props = OPEN, random = FIRST_FOUR) {
  const view = render(<SkullAnnotations {...props} random={random} />);
  return { ...view, root: view.container.firstElementChild };
}

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
    const left = root.querySelector('[data-annotation="L1"]');
    const leader = left.querySelector('[data-leader]');
    expect(leader).toHaveAttribute('aria-hidden', 'true');
    expect(leader).toHaveClass('left-full');
  });

  it('mirrors the leader for right-hand slots', () => {
    // random=0.999 takes R4 first, then L1, L2, L3 (see annotationSlots).
    const { root } = mount(OPEN, () => 0.999);
    const rightCard = root.querySelector('[data-annotation]');
    expect(rightCard).toHaveClass('right-[24%]');
    expect(rightCard.querySelector('[data-leader]')).toHaveClass('right-full');
  });
});

describe('SkullAnnotations placement', () => {
  it('places the cards at the picked slots, never overlapping', () => {
    const { root } = mount(OPEN, () => 0.3);
    const cards = [...root.querySelectorAll('[data-annotation]')];
    const ids = cards.map((card) => card.getAttribute('data-annotation'));
    expect(new Set(ids).size).toBe(4);
    for (const card of cards) {
      const slot = ANNOTATION_SLOTS.find((s) => s.id === card.getAttribute('data-annotation'));
      expect(card.style.top).toBe(`${slot.top}%`);
      expect(card).toHaveClass(slot.side === 'left' ? 'left-[24%]' : 'right-[24%]');
    }
  });

  it('assigns the cards to the picked slots in order', () => {
    const { root } = mount();
    const ids = [...root.querySelectorAll('[data-annotation]')].map((card) => card.getAttribute('data-annotation'));
    expect(ids).toEqual(['L1', 'L2', 'L3', 'L4']);
  });

  it('keeps the positions for the whole session (no reshuffle on re-render)', () => {
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
