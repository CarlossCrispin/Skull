import { render } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ASSEMBLY_RANGE_ATTR } from '../../lib/layout/anchors.js';
import { ASSEMBLY_RANGE_VIEWPORTS } from '../../lib/motion/constants.js';
import { AssemblyRange } from './AssemblyRange.jsx';
import { SECTIONS } from './sections.js';

const css = readFileSync('src/styles/index.css', 'utf8');

describe('AssemblyRange', () => {
  it('is an empty, inert, hidden section carrying the range anchor', () => {
    const { container } = render(<AssemblyRange />);
    const section = container.firstElementChild;
    expect(section.tagName).toBe('SECTION');
    expect(section).toHaveAttribute('aria-hidden', 'true');
    expect(section).toHaveAttribute(ASSEMBLY_RANGE_ATTR);
    expect(ASSEMBLY_RANGE_ATTR).toBe('data-assembly-range');
    expect(section).toHaveClass('assembly-range');
    expect(section.childElementCount).toBe(0);
    expect(section.textContent).toBe('');
    expect(section.hasAttribute('tabindex')).toBe(false);
  });

  it('is registered after frame 04', () => {
    expect(SECTIONS.map((entry) => entry.id)).toEqual(['frame-00', 'frame-01', 'frame-02', 'frame-03', 'frame-04', 'assembly-range']);
  });
});

describe('assembly-range stylesheet', () => {
  const body = (/@utility assembly-range\s*\{([^}]*)\}/.exec(css) ?? [])[1] ?? '';

  it('is (1 + range viewports) x 100svh tall with a 100vh fallback', () => {
    expect(ASSEMBLY_RANGE_VIEWPORTS).toBe(2);
    expect(body).toMatch(/height:\s*calc\(\(1 \+ 2\) \* 100vh\);[\s\S]*height:\s*calc\(\(1 \+ 2\) \* 100svh\)/);
  });

  it('has no sticky child rule', () => {
    expect(css).not.toMatch(/assembly-range[^{]*sticky|position:\s*sticky/);
  });
});
