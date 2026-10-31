import { render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { installIntersectionObserverStub, installMatchMediaStub } from '../../test/stubs.js';
import { HUD_GUTTER_CLASSES } from '../../styles/layout.js';
import { FRAMES } from '../../content/frames.js';
import { HudFrame } from './HudFrame.jsx';

afterEach(() => installMatchMediaStub({}));

function mount(frame, { reducedMotion = false, revealGate = true } = {}) {
  installIntersectionObserverStub();
  return render(<HudFrame frame={frame} reducedMotion={reducedMotion} revealGate={revealGate} />);
}

describe('HudFrame', () => {
  it('is a transparent full-height section above the skull layer, with the HUD gutter', () => {
    const { container } = mount(FRAMES[0]);
    const section = container.firstElementChild;
    expect(section.tagName).toBe('SECTION');
    expect(section.id).toBe('frame-01');
    expect(section).toHaveClass('relative', 'z-10', 'min-h-svh');
    for (const token of HUD_GUTTER_CLASSES.split(' ')) expect(section).toHaveClass(token);
    expect(section.classList.contains('bg-bg')).toBe(false);
  });

  it('has exactly one h2 with the title and no h1', () => {
    const { container } = mount(FRAMES[1]);
    const headings = container.querySelectorAll('h2');
    expect(headings).toHaveLength(1);
    expect(headings[0].textContent).toBe('OFRENDA');
    expect(container.querySelector('h1')).toBeNull();
  });

  it('shows the index chip as NN/05', () => {
    const { container } = mount(FRAMES[2]);
    expect(container.querySelector('[data-frame-chip]')?.textContent).toBe('03/05');
  });

  it('puts the label row, the body lines and the rows inside one HUD card', () => {
    const { container } = mount(FRAMES[1]);
    const cards = container.querySelectorAll('svg[data-glass-frame]');
    expect(cards).toHaveLength(1);
    const card = cards[0].parentElement;
    expect(card.textContent).toContain('NIVELES');
    expect(card.textContent).toContain('2 niveles: cielo y tierra.');
    expect(card.querySelectorAll('[role="group"]')).toHaveLength(1 + FRAMES[1].rows.length);
  });

  it('uses the orange (signal) badge tone for frame 01 and the accent for the rest', () => {
    const one = mount(FRAMES[0]);
    expect(one.container.querySelector('[data-hud-badge]')).toBeNull();
    expect(one.container.querySelector('[data-frame-accent]')).toHaveClass('bg-signal');
    one.unmount();
    const two = mount(FRAMES[1]);
    expect(two.container.querySelector('[data-frame-accent]')).toHaveClass('bg-accent');
  });

  it('is mobile first: one column unprefixed, two columns only from md', () => {
    const { container } = mount(FRAMES[0]);
    const grid = container.querySelector('[data-frame-grid]');
    expect(grid).toHaveClass('grid', 'md:grid-cols-2');
    expect(grid.className).not.toMatch(/(^|\s)grid-cols-/);
  });

  it('alternates the card side: odd frames card right, even frames card left from md', () => {
    const odd = mount(FRAMES[0]).container;
    expect(odd.querySelector('[data-frame-card]')).not.toHaveClass('md:order-1');
    expect(odd.querySelector('[data-frame-title]')).toHaveClass('md:order-1');
    const even = mount(FRAMES[1]).container;
    expect(even.querySelector('[data-frame-card]')).toHaveClass('md:order-1');
    expect(even.querySelector('[data-frame-title]')).toHaveClass('md:order-2');
  });

  it('sizes the title fluidly and lets it wrap', () => {
    const { container } = mount(FRAMES[2]);
    const title = container.querySelector('h2');
    expect(title).toHaveClass('font-display', 'uppercase');
    expect(title.className).toMatch(/text-\[clamp\(/);
    expect(title.className).not.toMatch(/whitespace-nowrap|truncate/);
  });

  it('marks the title and card as reveal items, and arms the reveal while motion is allowed', () => {
    const { container } = mount(FRAMES[0]);
    expect(container.firstElementChild.hasAttribute('data-reveal-ready')).toBe(true);
    expect(container.querySelectorAll('[data-reveal]')).toHaveLength(2);
  });

  it('under reduced motion never arms the hidden state', () => {
    const { container } = mount(FRAMES[0], { reducedMotion: true });
    expect(container.firstElementChild.hasAttribute('data-reveal-ready')).toBe(false);
  });

  it('keeps all content in the DOM before the gate opens', () => {
    const { container } = mount(FRAMES[3], { revealGate: false });
    expect(container.textContent).toContain('Diego Rivera la nombró Catrina en su mural de 1947.');
    expect(container.textContent).toContain('01–02.NOV');
  });

  it('adds no interactive elements', () => {
    const { container } = mount(FRAMES[1]);
    expect(container.querySelectorAll('a[href], button, input, [tabindex]')).toHaveLength(0);
  });
});
