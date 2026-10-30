import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const progress = vi.hoisted(() => ({ value: 0 }));
vi.mock('../../lib/scroll/useScrollProgress.js', () => ({ useScrollProgress: () => progress.value }));

const { Frame00Boot, FRAME_00_ID } = await import('./Frame00Boot.jsx');

const OPEN = { reducedMotion: false, revealGate: true, skullAssembled: true };
const CLOSED = { reducedMotion: false, revealGate: false, skullAssembled: true };
const REDUCED = { reducedMotion: true, revealGate: true, skullAssembled: false };

function mount(props = OPEN) {
  const view = render(<Frame00Boot {...props} />);
  return { ...view, section: view.container.firstElementChild };
}

const delayOf = (element) => element.style.animationDelay;

beforeEach(() => {
  progress.value = 0;
});

describe('Frame00Boot structure', () => {
  it('is the transparent frame-00 section, one viewport tall and above the skull layer', () => {
    const { section } = mount();
    expect(section.tagName).toBe('SECTION');
    expect(section.id).toBe('frame-00');
    expect(FRAME_00_ID).toBe('frame-00');
    expect(section).toHaveClass('min-h-svh', 'relative', 'z-10', 'overflow-x-clip');
    expect(section.className).not.toMatch(/\bbg-/);
  });

  it('holds the single h1 in the display font, uppercase, with the mono subline', () => {
    const { container } = mount();
    const h1s = container.querySelectorAll('h1');
    expect(h1s).toHaveLength(1);
    expect(h1s[0]).toHaveTextContent('Protocolo Ofrenda');
    expect(h1s[0]).toHaveClass('font-display', 'uppercase');
    expect(screen.getByText('Día de Muertos · sistema de memoria')).toBeInTheDocument();
  });

  it('keeps the title on one line from md, capped by the viewport width', () => {
    const { container } = mount();
    const h1 = container.querySelector('h1');
    expect(h1).toHaveClass('md:whitespace-nowrap', 'md:text-[clamp(3rem,9.5vw,8rem)]');
  });

  it('aligns the title block to the HUD gutter', () => {
    const { container } = mount();
    expect(container.querySelector('h1').parentElement).toHaveClass('px-5', 'md:px-[35px]');
  });

  it('contains the labelled navigation', () => {
    mount();
    expect(screen.getByRole('navigation', { name: 'Navegación principal' })).toBeInTheDocument();
  });

  it('draws the full-bleed grid with its plus marks', () => {
    const { container } = mount();
    expect(container.querySelectorAll('[data-grid="line-v"], [data-grid="line-h"]').length).toBeGreaterThan(0);
    expect(container.querySelectorAll('[data-grid="mark"]').length).toBeGreaterThan(0);
  });

  it('shows the three verified nodes, hidden below md', () => {
    const { container } = mount();
    const nodes = container.querySelector('[data-hud-nodes]');
    expect(nodes).toHaveClass('hidden', 'md:block');
    for (const text of [
      '[ MICTLÁN ]',
      'Inframundo mexica de nueve niveles.',
      '[ UNESCO_2008 ]',
      'Patrimonio cultural inmaterial de la humanidad.',
      '[ COORD_ ]',
      '19.4326° N · 99.1332° O',
    ]) {
      expect(within(nodes).getByText(text)).toBeInTheDocument();
    }
    expect(nodes.querySelectorAll('svg line').length).toBe(6);
  });

  it('binds the vertical 0-100 ruler to the scroll progress', () => {
    progress.value = 0.4;
    const { container } = mount();
    const ruler = container.querySelector('[data-ruler-indicator]');
    expect(ruler.style.top).toBe('40%');
    expect(container.querySelectorAll('[data-ruler-tick]')).toHaveLength(21);
  });

  it('anchors the ruler on the right edge inside the gutter, in the node band, hidden below md', () => {
    const { container } = mount();
    const wrapper = container.querySelector('[data-ruler-indicator]').closest('[data-hud-ruler]');
    expect(wrapper).toHaveClass('hidden', 'md:block', 'right-5', 'md:right-[35px]', 'top-[15%]', 'h-[30%]');
    expect(wrapper.className).not.toMatch(/\bleft-/);
  });

  it('keeps every node in the upper band, clear of the title block', () => {
    const { container } = mount();
    for (const node of container.querySelectorAll('[data-hud-node]')) {
      expect(node.style.top).toBe('15%');
    }
  });

  it('keeps every decorative svg and the ruler hidden from assistive tech', () => {
    const { container } = mount();
    for (const svg of container.querySelectorAll('svg')) expect(svg.closest('[aria-hidden="true"]')).not.toBeNull();
    expect(container.querySelector('[data-ruler-indicator]').closest('[aria-hidden="true"]')).not.toBeNull();
  });
});

describe('Frame00Boot bottom row', () => {
  it('stacks below md and sits in a row from md, on the HUD gutter', () => {
    mount();
    const row = screen.getByRole('button', { name: '✦ INICIAR PROTOCOLO' }).parentElement;
    expect(row).toHaveClass('flex-col', 'md:flex-row', 'px-5', 'md:px-[35px]');
  });

  it('renders a square signal CTA with ink text', () => {
    mount();
    const cta = screen.getByRole('button', { name: '✦ INICIAR PROTOCOLO' });
    expect(cta).toHaveClass('bg-signal', 'text-ink');
    expect(cta.className).not.toMatch(/rounded/);
  });

  it('shows the info card from sm with a signal badge, copy, barcode and system row', () => {
    const { container } = mount();
    const wrapper = container.querySelector('[data-info-card]');
    expect(wrapper).toHaveClass('hidden', 'sm:block');
    const badge = wrapper.querySelector('[data-hud-badge]');
    expect(badge).toHaveTextContent('//FECHA_ 01–02.NOV');
    expect(badge).toHaveClass('bg-signal', 'text-ink');
    expect(within(wrapper).getByText('De fines de octubre a inicios de noviembre, la memoria se enciende.')).toBeInTheDocument();
    expect(wrapper.querySelectorAll('svg[viewBox]:not([data-glass-frame])')).toHaveLength(1);
    const row = within(wrapper).getByRole('group');
    expect(row).toHaveTextContent('//SYS_MICTLAN.OS');
  });
});

describe('Frame00Boot CTA scroll', () => {
  let scrollIntoView;
  beforeEach(() => {
    scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;
  });
  afterEach(() => {
    delete Element.prototype.scrollIntoView;
    document.getElementById('frame-01')?.remove();
  });

  function addTarget() {
    const target = document.createElement('section');
    target.id = 'frame-01';
    document.body.append(target);
    return target;
  }

  it('scrolls smoothly to #frame-01', () => {
    const target = addTarget();
    mount();
    fireEvent.click(screen.getByRole('button', { name: '✦ INICIAR PROTOCOLO' }));
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });
    expect(scrollIntoView.mock.contexts[0]).toBe(target);
  });

  it('jumps instantly under reduced motion', () => {
    addTarget();
    mount(REDUCED);
    fireEvent.click(screen.getByRole('button', { name: '✦ INICIAR PROTOCOLO' }));
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'instant', block: 'start' });
  });

  it('does nothing when #frame-01 does not exist yet', () => {
    mount();
    fireEvent.click(screen.getByRole('button', { name: '✦ INICIAR PROTOCOLO' }));
    expect(scrollIntoView).not.toHaveBeenCalled();
  });
});

describe('Frame00Boot entrance gate', () => {
  it('plays no hud animation before the gate opens, and keeps everything in layout', () => {
    const { section } = mount(CLOSED);
    expect(section.querySelectorAll('[class*="hud-"]')).toHaveLength(0);
    expect(section.querySelector('[data-hud-decor]')).toHaveClass('invisible');
    expect(screen.getByRole('button', { name: '✦ INICIAR PROTOCOLO' })).toHaveClass('invisible');
    expect(section.querySelector('h1')).toHaveClass('invisible');
  });

  it('starts the entrance when the gate opens, with the specified delays', () => {
    const { container } = mount(OPEN);
    expect(container.querySelector('h1')).toHaveClass('hud-fade-up');
    expect(delayOf(container.querySelector('h1'))).toBe('400ms');
    expect(delayOf(screen.getByRole('button', { name: '✦ INICIAR PROTOCOLO' }))).toBe('900ms');
    expect(delayOf(container.querySelector('[data-info-card]'))).toBe('1100ms');
    const lines = [...container.querySelectorAll('[data-grid^="line"]')];
    const marks = [...container.querySelectorAll('[data-grid="mark"]')];
    expect(delayOf(lines[0])).toBe('600ms');
    expect(delayOf(marks[0])).toBe('1000ms');
    expect(delayOf(marks[1])).toBe('1080ms');
    expect(container.querySelector('[data-hud-decor]')).not.toHaveClass('invisible');
  });

  it('puts each node label and connector before its box', () => {
    const { container } = mount(OPEN);
    const nodes = [...container.querySelectorAll('[data-hud-node]')];
    expect(nodes).toHaveLength(3);
    for (const node of nodes) {
      const label = Number.parseInt(delayOf(node.querySelector('[data-node-label]')), 10);
      const box = Number.parseInt(delayOf(node.querySelector('[data-node-box]')), 10);
      const connector = Number.parseInt(node.getAttribute('data-connector-ms'), 10);
      expect(label).toBeLessThan(connector);
      expect(connector).toBeLessThan(box);
    }
  });

  it('shows everything immediately under reduced motion', () => {
    const { section } = mount({ reducedMotion: true, revealGate: false, skullAssembled: true });
    expect(section.querySelector('.invisible')).toBeNull();
    expect(section.querySelectorAll('[class*="hud-"]')).toHaveLength(0);
  });
});

describe('Frame00Boot skull annotations', () => {
  it('renders the four annotation cards in a layer hidden below md, over the skull', () => {
    const { container } = mount();
    const layer = container.querySelector('[data-annotation]').parentElement;
    expect(layer).toHaveClass('hidden', 'md:block');
    expect(layer.querySelectorAll('[data-annotation]')).toHaveLength(4);
    expect(container.querySelector('time')).toBeInTheDocument();
  });

  it('keeps exactly one h1 with the annotations mounted', () => {
    const { container } = mount();
    expect(container.querySelectorAll('h1')).toHaveLength(1);
  });

  it('fades the annotations out when the skull is no longer assembled', () => {
    const { container } = mount({ reducedMotion: false, revealGate: true, skullAssembled: false });
    const layer = container.querySelector('[data-annotation]').parentElement;
    expect(layer).toHaveClass('hud-fade-out');
  });

  it('keeps them hidden before the gate opens', () => {
    const { container } = mount(CLOSED);
    expect(container.querySelectorAll('[data-annotation]')).toHaveLength(4);
    for (const card of container.querySelectorAll('[data-annotation]')) expect(card).toHaveClass('invisible');
  });
});

describe('Frame00Boot annotation obstacles', () => {
  it('marks the title block, nodes, CTA, info card, ruler and nav as areas the annotations avoid', () => {
    const { container } = mount();
    const avoided = [...container.querySelectorAll('[data-hud-avoid]')];
    const has = (selector) => avoided.some((el) => el.matches(selector) || el.querySelector(selector) !== null);
    const title = container.querySelector('h1');
    expect(avoided.some((el) => el.contains(title))).toBe(true);
    expect(avoided.some((el) => el.contains(title) && el.querySelector('p') !== null)).toBe(true);
    expect(container.querySelectorAll('[data-hud-node][data-hud-avoid]')).toHaveLength(3);
    expect(container.querySelector('button[data-hud-avoid]')).not.toBeNull();
    expect(container.querySelector('[data-info-card][data-hud-avoid]')).not.toBeNull();
    expect(container.querySelector('[data-hud-ruler][data-hud-avoid]')).not.toBeNull();
    expect(container.querySelector('nav[data-hud-avoid]')).not.toBeNull();
    expect(has('h1')).toBe(true);
  });

  it('does not mark the annotation layer itself', () => {
    const { container } = mount();
    expect(container.querySelector('[data-annotations][data-hud-avoid]')).toBeNull();
  });
});

