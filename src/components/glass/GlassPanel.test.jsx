import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { createFrameMirror } from '../../lib/glass/frameMirror.js';
import { installResizeObserverStub } from '../../test/stubs.js';
import { GlassContext } from './GlassContext.js';
import { GLASS_PANEL_ATTR } from '../../lib/layout/anchors.js';
import { GLASS_FILTER_ID, GLASS_FROST_PERCENT } from '../../lib/glass/constants.js';
import { GlassPanel } from './GlassPanel.jsx';

export function renderPanel(props = {}) {
  const view = render(
    <GlassPanel {...props}>
      <p data-testid="child">poem</p>
    </GlassPanel>,
  );
  const panel = view.container.firstElementChild;
  return { ...view, panel };
}

describe('glass constants', () => {
  it('names the filter id and the frost share', () => {
    expect(GLASS_FILTER_ID).toBe('liquid-glass-refraction');
    expect(GLASS_FROST_PERCENT).toBe(72);
  });
});

describe('GlassPanel structure', () => {
  it('marks itself as the glass panel in frost mode', () => {
    const { panel } = renderPanel();
    expect(panel.hasAttribute(GLASS_PANEL_ATTR)).toBe(true);
    expect(panel.getAttribute('data-glass-mode')).toBe('frost');
  });

  it('has no CSS border, radius, shadow or backdrop effect: the frame is the chamfered SVG', () => {
    const { panel } = renderPanel();
    expect(panel.classList.contains('glass-panel')).toBe(true);
    expect(panel.classList.contains('border')).toBe(false);
    expect(panel.className).not.toMatch(/border|rounded|shadow|backdrop|blur/);
  });

  it('draws the aria-hidden chamfered frame once, after the frost and before the content', () => {
    const { panel, getByTestId } = renderPanel();
    const frames = panel.querySelectorAll('svg[data-glass-frame]');
    expect(frames).toHaveLength(1);
    const frame = frames[0];
    expect(frame.getAttribute('aria-hidden')).toBe('true');
    expect(frame.parentElement).toBe(panel);
    const frost = panel.querySelector('.glass-frost');
    const content = getByTestId('child').parentElement;
    expect(frost.compareDocumentPosition(frame) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(frame.compareDocumentPosition(content) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('renders an aria-hidden, non-interactive frost layer', () => {
    const { panel } = renderPanel();
    const frosts = panel.querySelectorAll('.glass-frost');
    expect(frosts).toHaveLength(1);
    const frost = frosts[0];
    expect(frost.getAttribute('aria-hidden')).toBe('true');
    expect(frost.textContent).toBe('');
    expect(frost.querySelectorAll('a, button, input, select, textarea, [tabindex]')).toHaveLength(0);
    expect(frost.hasAttribute('tabindex')).toBe(false);
  });

  it('renders children in a relative content wrapper after the frost layer', () => {
    const { panel, getByTestId } = renderPanel();
    const child = getByTestId('child');
    const wrapper = child.parentElement;
    expect(wrapper.classList.contains('relative')).toBe(true);
    expect(wrapper.parentElement).toBe(panel);
    const frost = panel.querySelector('.glass-frost');
    expect(frost.compareDocumentPosition(wrapper) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('forwards extra classes (the gutters) to the panel', () => {
    const { panel } = renderPanel({ className: 'px-5 py-24' });
    expect(panel.classList.contains('px-5')).toBe(true);
    expect(panel.classList.contains('py-24')).toBe(true);
    expect(panel.classList.contains('glass-panel')).toBe(true);
  });

  it('adds no accessible name or text of its own', () => {
    const { panel } = renderPanel();
    expect(panel.hasAttribute('aria-label')).toBe(false);
    expect(panel.hasAttribute('aria-labelledby')).toBe(false);
    expect(panel.hasAttribute('role')).toBe(false);
    expect(panel.textContent).toBe('poem');
  });
});

describe('GlassPanel reveal gate (G6)', () => {
  it('is hidden while the gate is closed and visible once it opens', () => {
    const { panel, rerender } = renderPanel({ revealGate: false });
    expect(panel.hasAttribute('data-glass-hidden')).toBe(true);
    rerender(
      <GlassPanel revealGate>
        <p>poem</p>
      </GlassPanel>,
    );
    expect(panel.hasAttribute('data-glass-hidden')).toBe(false);
  });

  it('is visible at once by default (gate open)', () => {
    const { panel } = renderPanel();
    expect(panel.hasAttribute('data-glass-hidden')).toBe(false);
  });

  it('is never hidden under reduced motion, even with a closed gate', () => {
    const { panel } = renderPanel({ reducedMotion: true, revealGate: false });
    expect(panel.hasAttribute('data-glass-hidden')).toBe(false);
  });

  it('shows the panel when motion becomes reduced while the gate is closed', () => {
    const { panel, rerender } = renderPanel({ revealGate: false });
    expect(panel.hasAttribute('data-glass-hidden')).toBe(true);
    rerender(
      <GlassPanel revealGate={false} reducedMotion>
        <p>poem</p>
      </GlassPanel>,
    );
    expect(panel.hasAttribute('data-glass-hidden')).toBe(false);
  });
});

function renderWithContext(
  sceneStatus,
  props = {},
  mirror = createFrameMirror(),
) {
  installResizeObserverStub();
  const wrap = (children) => (
    <GlassContext.Provider value={{ mirror, sceneStatus }}>{children}</GlassContext.Provider>
  );
  const view = render(
    wrap(
      <GlassPanel {...props}>
        <p data-testid="child">poem</p>
      </GlassPanel>,
    ),
  );
  const rerenderWith = (status, next = props) =>
    view.rerender(
      <GlassContext.Provider value={{ mirror, sceneStatus: status }}>
        <GlassPanel {...next}>
          <p data-testid="child">poem</p>
        </GlassPanel>
      </GlassContext.Provider>,
    );
  const panel = view.container.firstElementChild;
  return { ...view, panel, rerenderWith };
}

describe('GlassPanel modes (Decision 39)', () => {
  it('is live when the scene is ready and the filter is supported: window, filter and mode attribute', () => {
    const { panel } = renderWithContext('ready', { filterSupported: true });
    expect(panel.getAttribute('data-glass-mode')).toBe('live');
    expect(panel.querySelectorAll('.glass-window')).toHaveLength(1);
    expect(panel.querySelectorAll('canvas.glass-copy')).toHaveLength(1);
    expect(panel.querySelectorAll('filter#liquid-glass-refraction')).toHaveLength(1);
    expect(panel.querySelectorAll('svg[data-glass-frame]')).toHaveLength(1);
  });

  it('paints the window first, then the frost, then the content', () => {
    const { panel, getByTestId } = renderWithContext('ready', { filterSupported: true });
    const glassWindow = panel.querySelector('.glass-window');
    const frost = panel.querySelector('.glass-frost');
    const content = getByTestId('child').parentElement;
    expect(glassWindow.compareDocumentPosition(frost) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(frost.compareDocumentPosition(content) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it.each([
    ['reduced motion', 'ready', { reducedMotion: true, filterSupported: true }],
    ['scene failed', 'failed', { filterSupported: true }],
    ['context lost', 'lost', { filterSupported: true }],
    ['scene loading', 'loading', { filterSupported: true }],
    ['filter unsupported', 'ready', { filterSupported: false }],
  ])('is frost with no window, copy or filter for %s', (_name, status, props) => {
    const { panel } = renderWithContext(status, props);
    expect(panel.getAttribute('data-glass-mode')).toBe('frost');
    expect(panel.querySelectorAll('.glass-window, canvas, svg:not([data-glass-frame]), filter')).toHaveLength(0);
    expect(panel.querySelectorAll('svg[data-glass-frame]')).toHaveLength(1);
  });

  it('is frost without a mirror even when the scene is ready', () => {
    const { panel } = renderWithContext('ready', { filterSupported: true }, null);
    expect(panel.getAttribute('data-glass-mode')).toBe('frost');
    expect(panel.querySelectorAll('.glass-window')).toHaveLength(0);
  });

  it('is frost without any provider (default context)', () => {
    const { panel } = renderPanel({ filterSupported: true });
    expect(panel.getAttribute('data-glass-mode')).toBe('frost');
  });

  it('asks the browser whether the filter reference is supported when not injected', () => {
    const supports = vi.fn(() => false);
    vi.stubGlobal('CSS', { supports });
    try {
      const { panel } = renderWithContext('ready');
      expect(supports).toHaveBeenCalledWith('filter', 'url("#liquid-glass-refraction")');
      expect(panel.getAttribute('data-glass-mode')).toBe('frost');
      vi.stubGlobal('CSS', { supports: () => true });
      const live = renderWithContext('ready');
      expect(live.panel.getAttribute('data-glass-mode')).toBe('live');
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('is frost when the browser has no CSS.supports', () => {
    vi.stubGlobal('CSS', undefined);
    try {
      const { panel } = renderWithContext('ready');
      expect(panel.getAttribute('data-glass-mode')).toBe('frost');
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('switches mode with the scene status and keeps the content node and flow untouched', () => {
    const { panel, getByTestId, rerenderWith } = renderWithContext('loading', { filterSupported: true });
    const content = getByTestId('child').parentElement;
    expect(panel.getAttribute('data-glass-mode')).toBe('frost');
    rerenderWith('ready');
    expect(panel.getAttribute('data-glass-mode')).toBe('live');
    expect(getByTestId('child').parentElement).toBe(content);
    expect(panel.querySelectorAll('svg[data-glass-frame]')).toHaveLength(1);
    const svg = panel.querySelector('svg:not([data-glass-frame])');
    expect(svg.getAttribute('class')).toContain('absolute');
    expect(svg.getAttribute('width')).toBe('0');
    rerenderWith('lost');
    expect(panel.getAttribute('data-glass-mode')).toBe('frost');
    expect(panel.querySelectorAll('.glass-window')).toHaveLength(0);
    expect(getByTestId('child').parentElement).toBe(content);
  });

  it('subscribes the window to the mirror in live mode and releases it in frost', () => {
    const mirror = createFrameMirror();
    const requester = vi.fn();
    mirror.setRequester(requester);
    const { rerenderWith } = renderWithContext('ready', { filterSupported: true }, mirror);
    expect(requester).toHaveBeenCalledTimes(1);
    const getContext = vi.fn(() => ({ fillRect: vi.fn(), drawImage: vi.fn(), fillStyle: '' }));
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = getContext;
    try {
      mirror.publish({}, 1);
      expect(getContext).toHaveBeenCalledTimes(1);
      rerenderWith('failed');
      mirror.publish({}, 2);
      expect(getContext).toHaveBeenCalledTimes(1);
    } finally {
      HTMLCanvasElement.prototype.getContext = original;
    }
  });

  it('keeps the window idle while the reveal gate is closed', () => {
    const mirror = createFrameMirror();
    renderWithContext('ready', { filterSupported: true, revealGate: false }, mirror);
    const getContext = vi.fn(() => ({ fillRect: vi.fn(), drawImage: vi.fn(), fillStyle: '' }));
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = getContext;
    try {
      mirror.publish({}, 1);
      expect(getContext).not.toHaveBeenCalled();
    } finally {
      HTMLCanvasElement.prototype.getContext = original;
    }
  });
});
