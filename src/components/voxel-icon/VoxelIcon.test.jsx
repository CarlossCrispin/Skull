import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { COLORS } from '../../styles/tokens.js';
import { VoxelIcon } from './VoxelIcon.jsx';

const TOKEN_VALUES = Object.values(COLORS).map((hex) => hex.toLowerCase());

function renderIcon() {
  const { container } = render(<VoxelIcon />);
  const svg = container.querySelector('svg');
  if (svg === null) throw new Error('VoxelIcon rendered no svg');
  return svg;
}

describe('VoxelIcon', () => {
  it('is a decorative inline svg with no name or text', () => {
    const svg = renderIcon();
    expect(svg.getAttribute('aria-hidden')).toBe('true');
    expect(svg.getAttribute('focusable')).toBe('false');
    expect(svg.querySelector('title')).toBeNull();
    expect(svg.textContent).toBe('');
    expect(svg.hasAttribute('aria-label')).toBe(false);
  });

  it('is crisp and about 1em tall', () => {
    const svg = renderIcon();
    expect(svg.getAttribute('shape-rendering')).toBe('crispEdges');
    expect(svg.getAttribute('height')).toBe('1em');
  });

  it('draws voxels using ink plus at most the two accents, all palette tokens', () => {
    const fills = [...renderIcon().querySelectorAll('[fill]')].map((node) => (node.getAttribute('fill')).toLowerCase());
    expect(fills.length).toBeGreaterThan(10);
    for (const fill of fills) expect(TOKEN_VALUES).toContain(fill);
    const used = new Set(fills);
    expect(used.has(COLORS.ink.toLowerCase())).toBe(true);
    expect([...used].filter((fill) => fill !== COLORS.ink.toLowerCase()).length).toBeLessThanOrEqual(2);
  });

  it('has no gradient, filter or shadow', () => {
    const markup = renderIcon().outerHTML.toLowerCase();
    for (const banned of ['gradient', 'filter', 'shadow', 'url(']) expect(markup).not.toContain(banned);
  });

  it('renders identical markup for the title and the signature', () => {
    const first = render(<VoxelIcon />).container.innerHTML;
    const second = render(<VoxelIcon />).container.innerHTML;
    expect(first.length).toBeGreaterThan(0);
    expect(second).toBe(first);
  });
});
