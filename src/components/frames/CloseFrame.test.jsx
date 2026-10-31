import { render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { installIntersectionObserverStub } from '../../test/stubs.js';
import { HUD_GUTTER_CLASSES } from '../../styles/layout.js';
import { CLOSE } from '../../content/close.js';
import { CloseFrame } from './CloseFrame.jsx';

function mount(props = {}) {
  installIntersectionObserverStub();
  return render(<CloseFrame reducedMotion={false} revealGate {...props} />);
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(Date.UTC(2026, 9, 29, 6, 0, 0));
});
afterEach(() => vi.useRealTimers());

describe('CloseFrame', () => {
  it('is a transparent full-height section above the skull, content at the bottom, with the HUD gutter', () => {
    const section = mount().container.firstElementChild;
    expect(section.tagName).toBe('SECTION');
    expect(section.id).toBe('frame-05');
    expect(section).toHaveClass('relative', 'z-10', 'min-h-svh', 'flex', 'flex-col', 'justify-end');
    for (const token of HUD_GUTTER_CLASSES.split(' ')) expect(section).toHaveClass(token);
    expect(section.classList.contains('bg-bg')).toBe(false);
  });

  it('has one h2 and the 05/05 chip', () => {
    const { container } = mount();
    expect(container.querySelectorAll('h2')).toHaveLength(1);
    expect(container.querySelector('h2').textContent).toBe(CLOSE.title);
    expect(container.querySelector('[data-frame-chip]').textContent).toBe('05/05');
  });

  it('shows the UNESCO row and line in a HUD card', () => {
    const { container } = mount();
    const card = container.querySelector('[data-close-heritage]');
    expect(card.querySelector('svg[data-glass-frame]')).not.toBeNull();
    expect(card.textContent).toContain('PATRIMONIO');
    expect(card.textContent).toContain('UNESCO');
    expect(card.textContent).toContain('Inscrita por la UNESCO en 2008 (proclamada en 2003).');
  });

  it('shows the date and a live countdown that does not announce every second', () => {
    const { container } = mount();
    const card = container.querySelector('[data-close-countdown]');
    expect(card.textContent).toContain('01–02.NOV');
    const live = card.querySelector('[aria-live]');
    expect(live.getAttribute('aria-live')).toBe('off');
    expect(live.textContent).toBe('03:00:00:00');
    expect(card.textContent).toContain('CUENTA');
  });

  it('shows HOY during the festivity', () => {
    vi.setSystemTime(Date.UTC(2026, 10, 1, 18, 0, 0));
    const { container } = mount();
    expect(container.querySelector('[data-close-countdown] [aria-live]').textContent).toBe('HOY');
  });

  it('signs with the barcode first, then the author row, then the Instagram link', () => {
    const { container } = mount();
    const card = container.querySelector('[data-close-signature]');
    const order = [...card.querySelectorAll('svg[aria-hidden="true"]:not([data-glass-frame]), [role="group"], a')].map((node) =>
      node.tagName === 'svg' ? 'barcode' : node.tagName === 'A' ? 'link' : 'row',
    );
    expect(order).toEqual(['barcode', 'row', 'link']);
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

  it('reveals in order with the signature card last', () => {
    const { container } = mount();
    const items = [...container.querySelectorAll('[data-reveal]')];
    expect(items.map((item) => item.getAttribute('data-close-item'))).toEqual(['title', 'heritage', 'countdown', 'signature']);
  });

  it('keeps the copy in the DOM and arms no hidden state under reduced motion', () => {
    const { container } = mount({ reducedMotion: true });
    expect(container.firstElementChild.hasAttribute('data-reveal-ready')).toBe(false);
    expect(container.textContent).toContain('@carloscrispin.cc');
  });
});
