import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { COLORS } from '../../styles/tokens.js';
import { installIntersectionObserverStub } from '../../test/stubs.js';
import { ScrollIndicator } from './ScrollIndicator.jsx';

function renderIndicator(reducedMotion = false) {
  const stub = installIntersectionObserverStub();
  const { container } = render(<ScrollIndicator reducedMotion={reducedMotion} />);
  const root = container.firstElementChild;
  return { stub, container, root };
}

describe('ScrollIndicator', () => {
  it('is a decorative reveal item with no text, focus or handlers', () => {
    const { container, root } = renderIndicator();
    expect(root.getAttribute('aria-hidden')).toBe('true');
    expect(root.getAttribute('data-reveal')).toBe('indicator');
    expect(container.textContent).toBe('');
    expect(container.querySelectorAll('a, button, input, select, textarea, [tabindex], [role]')).toHaveLength(0);
    for (const node of [root, ...container.querySelectorAll('*')]) {
      expect([...node.getAttributeNames()].filter((name) => name.startsWith('on'))).toEqual([]);
    }
  });

  it('draws an inline pixel-art chevron from palette tokens only', () => {
    const { root } = renderIndicator();
    const svg = root.querySelector('svg');
    expect(svg.getAttribute('shape-rendering')).toBe('crispEdges');
    expect(svg.getAttribute('focusable')).toBe('false');
    expect(svg.getAttribute('aria-hidden')).toBe('true');
    const rects = [...svg.querySelectorAll('rect')];
    expect(rects.length).toBeGreaterThan(3);
    const palette = Object.values(COLORS);
    for (const rect of rects) expect(palette).toContain(rect.getAttribute('fill'));
  });

  it('bobs only outside reduced motion', () => {
    const normal = renderIndicator(false);
    expect(normal.root.querySelectorAll('.indicator-bob')).toHaveLength(1);
    const reduced = renderIndicator(true);
    expect(reduced.root.querySelectorAll('.indicator-bob')).toHaveLength(0);
    expect(reduced.root.querySelector('svg')).not.toBeNull();
  });

  it('hides on the next scroll after it is at least 50 % visible', () => {
    const { stub, root } = renderIndicator();
    stub.trigger(root, 0.5);
    fireEvent.scroll(window);
    expect(root.hasAttribute('data-hidden')).toBe(true);
  });
});
