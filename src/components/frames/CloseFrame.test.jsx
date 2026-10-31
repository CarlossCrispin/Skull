import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { installIntersectionObserverStub } from '../../test/stubs.js';
import { HUD_GUTTER_CLASSES } from '../../styles/layout.js';
import { CloseFrame } from './CloseFrame.jsx';

function mount(props = {}) {
  installIntersectionObserverStub();
  return render(<CloseFrame reducedMotion={false} revealGate {...props} />);
}

describe('CloseFrame', () => {
  it('is a transparent full-height section above the skull, content at the bottom, with the HUD gutter', () => {
    const section = mount().container.firstElementChild;
    expect(section.tagName).toBe('SECTION');
    expect(section.id).toBe('frame-05');
    expect(section).toHaveClass('relative', 'z-10', 'min-h-svh', 'flex', 'flex-col', 'justify-end');
    for (const token of HUD_GUTTER_CLASSES.split(' ')) expect(section).toHaveClass(token);
    expect(section.classList.contains('bg-bg')).toBe(false);
  });

  it('shows no chip, no visible title and only a visually hidden h2', () => {
    const { container } = mount();
    expect(container.querySelector('[data-frame-chip]')).toBeNull();
    expect(container.querySelector('[data-frame-accent]')).toBeNull();
    const headings = container.querySelectorAll('h2');
    expect(headings).toHaveLength(1);
    expect(headings[0]).toHaveClass('sr-only');
    expect(headings[0].textContent).toBe('Autor');
    expect(container.textContent).not.toContain('CIERRE');
    expect(container.textContent).not.toContain('05/05');
  });

  it('renders one HUD card: no heritage, date, countdown or barcode', () => {
    const { container } = mount();
    expect(container.querySelectorAll('svg[data-glass-frame]')).toHaveLength(1);
    expect(container.querySelector('[data-close-heritage], [data-close-countdown], [aria-live]')).toBeNull();
    expect(container.querySelectorAll('svg[aria-hidden="true"]:not([data-glass-frame])')).toHaveLength(0);
    expect(container.textContent).not.toMatch(/UNESCO|NOV|CUENTA|HOY/);
  });

  it('signs with the author row, then the Instagram link', () => {
    const { container } = mount();
    const card = container.querySelector('[data-close-signature]');
    const order = [...card.querySelectorAll('[role="group"], a')].map((node) => (node.tagName === 'A' ? 'link' : 'row'));
    expect(order).toEqual(['row', 'link']);
    expect(card.textContent).toContain('AUTOR');
    expect(card.textContent).toContain('CARLOS CRISPIN');
  });

  it('links to the Instagram profile safely, with an accessible name and a 44 px target', () => {
    const link = mount().container.querySelector('a');
    expect(link.textContent).toBe('@carloscrispin.cc');
    expect(link.getAttribute('href')).toBe('https://www.instagram.com/carloscrispin.cc/');
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toBe('noopener noreferrer');
    expect(link.getAttribute('aria-label')).toBe('Instagram de Carlos Crispin (se abre en una pestaña nueva)');
    expect(link).toHaveClass('min-h-11', 'inline-flex', 'items-center');
    expect(link.className).toMatch(/focus-visible:outline/);
  });

  it('reveals the signature card as its only item', () => {
    const { container } = mount();
    const items = [...container.querySelectorAll('[data-reveal]')];
    expect(items.map((item) => item.getAttribute('data-close-item'))).toEqual(['signature']);
  });

  it('keeps the copy in the DOM and arms no hidden state under reduced motion', () => {
    const { container } = mount({ reducedMotion: true });
    expect(container.firstElementChild.hasAttribute('data-reveal-ready')).toBe(false);
    expect(container.textContent).toContain('@carloscrispin.cc');
  });
});
