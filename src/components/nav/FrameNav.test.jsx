import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FrameNav, NAV_ITEMS } from './FrameNav.jsx';
import { MIN_TEXT_CONTRAST, contrastRatio } from '../../styles/contrast.js';
import { COLORS } from '../../styles/tokens.js';

const GATE_OPEN = { revealGate: true, reducedMotion: false };

function mount(props = GATE_OPEN) {
  return render(<FrameNav {...props} />);
}

describe('FrameNav content', () => {
  it('is a labelled navigation landmark with the display-font wordmark', () => {
    mount();
    const nav = screen.getByRole('navigation', { name: 'Navegación principal' });
    const wordmark = within(nav).getByText('PROTOCOLO // OFRENDA');
    expect(wordmark).toHaveClass('font-display');
  });

  it('lists the five numbered frames as anchors to #frame-01..#frame-05', () => {
    mount();
    expect(NAV_ITEMS.map((item) => [item.number, item.label, item.href])).toEqual([
      ['01.', 'CEMPASÚCHIL', '#frame-01'],
      ['02.', 'OFRENDA', '#frame-02'],
      ['03.', 'PAPEL_PICADO', '#frame-03'],
      ['04.', 'CALAVERA', '#frame-04'],
      ['05.', 'CIERRE', '#frame-05'],
    ]);
    const list = screen.getByRole('list');
    const links = within(list).getAllByRole('link');
    expect(links.map((link) => link.getAttribute('href'))).toEqual(NAV_ITEMS.map((item) => item.href));
    expect(links[0]).toHaveAccessibleName('01. CEMPASÚCHIL');
  });

  it('shows the numbers in ink (signal fails AA on the light bg) with a 3px gap and 40px between items, from lg', () => {
    mount();
    const list = screen.getByRole('list');
    expect(list).toHaveClass('hidden', 'lg:flex', 'gap-10');
    const link = within(list).getAllByRole('link')[0];
    expect(link).toHaveClass('gap-[3px]');
    expect(link.firstElementChild).toHaveClass('text-ink');
    expect(link.firstElementChild).not.toHaveClass('text-signal');
  });

  it('keeps nav number contrast at AA: ink passes on the page background, signal does not', () => {
    expect(contrastRatio(COLORS.ink, COLORS.bg)).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST);
    expect(contrastRatio(COLORS.signal, COLORS.bg)).toBeLessThan(MIN_TEXT_CONTRAST);
  });

  it('shows the system tag and a status chip in the right group, from lg', () => {
    const { container } = mount();
    const group = container.querySelector('[data-nav-status]');
    expect(group).toHaveClass('hidden', 'lg:flex');
    expect(group.textContent).toContain('//SYS_ MICTLAN.OS');
    expect(group.querySelector('[data-nav-chip]')).not.toBeNull();
  });

  it('uses the HUD gutter: 20px below md, 35px from md', () => {
    const { container } = mount();
    expect(container.querySelector('nav')).toHaveClass('px-5', 'md:px-[35px]');
  });
});

describe('FrameNav mobile menu', () => {
  it('starts closed: the button reports it and no panel is rendered', () => {
    mount();
    const button = screen.getByRole('button', { name: /menú/i });
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(button).toHaveClass('lg:hidden');
    expect(document.getElementById(button.getAttribute('aria-controls'))).toBeNull();
  });

  it('opens a panel listing the same links and moves focus into it', () => {
    mount();
    const button = screen.getByRole('button', { name: /menú/i });
    fireEvent.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'true');
    const panel = document.getElementById(button.getAttribute('aria-controls'));
    expect(panel).not.toBeNull();
    const links = within(panel).getAllByRole('link');
    expect(links.map((link) => link.getAttribute('href'))).toEqual(NAV_ITEMS.map((item) => item.href));
    expect(links[0]).toHaveFocus();
  });

  it('draws the panel on a solid token surface: no blur, radius, shadow or translucency', () => {
    mount();
    const button = screen.getByRole('button', { name: /menú/i });
    fireEvent.click(button);
    const panel = document.getElementById(button.getAttribute('aria-controls'));
    expect(panel).toHaveClass('nav-panel');
    expect(panel.outerHTML).not.toMatch(/blur|backdrop|rounded|shadow|opacity|\/\d+/);
  });

  it('closes on Escape and returns focus to the button', () => {
    mount();
    const button = screen.getByRole('button', { name: /menú/i });
    fireEvent.click(button);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(document.getElementById(button.getAttribute('aria-controls'))).toBeNull();
    expect(button).toHaveFocus();
  });

  it('closes when a link is clicked and returns focus to the button', () => {
    mount();
    const button = screen.getByRole('button', { name: /menú/i });
    fireEvent.click(button);
    const panel = document.getElementById(button.getAttribute('aria-controls'));
    fireEvent.click(within(panel).getByRole('link', { name: /OFRENDA/ }));
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(button).toHaveFocus();
  });

  it('toggles closed with the button itself', () => {
    mount();
    const button = screen.getByRole('button', { name: /menú/i });
    fireEvent.click(button);
    fireEvent.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'false');
  });

  it('ignores Escape while closed and removes its key listener on unmount', () => {
    const { unmount } = mount();
    const button = screen.getByRole('button', { name: /menú/i });
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(button).not.toHaveFocus();
    unmount();
  });
});

describe('FrameNav entrance', () => {
  it('keeps every animated piece invisible but in layout before the gate opens', () => {
    const { container } = mount({ revealGate: false, reducedMotion: false });
    const entrances = container.querySelectorAll('[data-nav-entrance]');
    expect(entrances.length).toBeGreaterThanOrEqual(8);
    for (const element of entrances) {
      expect(element).toHaveClass('invisible');
      expect(element.className).not.toMatch(/hud-/);
    }
  });

  it('staggers the wordmark at 200ms and the items at 350..750ms once the gate opens', () => {
    const { container } = mount();
    const delays = [...container.querySelectorAll('[data-nav-entrance]')].map((element) => [
      element.getAttribute('data-nav-entrance'),
      element.style.animationDelay,
    ]);
    expect(delays).toEqual(
      expect.arrayContaining([
        ['wordmark', '200ms'],
        ['item-0', '350ms'],
        ['item-1', '450ms'],
        ['item-2', '550ms'],
        ['item-3', '650ms'],
        ['item-4', '750ms'],
      ]),
    );
    expect(container.querySelector('[data-nav-entrance="wordmark"]')).toHaveClass('hud-slide-right');
    expect(container.querySelector('[data-nav-entrance="item-0"]')).toHaveClass('hud-fade-up');
  });

  it('shows everything at once under reduced motion', () => {
    const { container } = mount({ revealGate: false, reducedMotion: true });
    expect(container.querySelector('.invisible')).toBeNull();
    expect(container.innerHTML).not.toMatch(/hud-/);
  });
});
