import { act, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { chamferBracketPoints, chamferFramePoints } from '../../lib/glass/chamfer.js';
import { GLASS_BRACKET_ARM_PX, GLASS_BRACKET_INSET_PX, GLASS_CHAMFER_PX } from '../../lib/glass/constants.js';
import { installResizeObserverStub } from '../../test/stubs.js';
import { ChamferFrame } from './ChamferFrame.jsx';

let ro;
const original = SVGElement.prototype.getBoundingClientRect;

beforeEach(() => {
  ro = installResizeObserverStub();
  SVGElement.prototype.getBoundingClientRect = () => ({ width: 720, height: 400 });
});

afterEach(() => {
  SVGElement.prototype.getBoundingClientRect = original;
});

function renderFrame() {
  const view = render(<ChamferFrame />);
  const svg = view.container.querySelector('svg');
  return { ...view, svg };
}

describe('ChamferFrame', () => {
  it('draws the chamfered polygon in the measured box with a non-scaling grey stroke', () => {
    const { svg } = renderFrame();
    expect(svg.getAttribute('viewBox')).toBe('0 0 720 400');
    expect(svg.getAttribute('preserveAspectRatio')).toBe('none');
    const polygons = svg.querySelectorAll('polygon');
    expect(polygons).toHaveLength(1);
    const polygon = polygons[0];
    expect(polygon.getAttribute('points')).toBe(chamferFramePoints(720, 400, GLASS_CHAMFER_PX, 0.5));
    expect(polygon.getAttribute('vector-effect')).toBe('non-scaling-stroke');
    expect(polygon.getAttribute('fill')).toBe('none');
    expect(polygon.getAttribute('stroke-width')).toBe('1');
    expect(polygon.getAttribute('class')).toContain('stroke-gray-400');
  });

  it('adds one bracket mark at the top-right and one at the bottom-left, in the same grey', () => {
    const { svg } = renderFrame();
    const brackets = [...svg.querySelectorAll('polyline')];
    expect(brackets.map((bracket) => bracket.getAttribute('points'))).toEqual(
      chamferBracketPoints(720, 400, GLASS_BRACKET_ARM_PX, GLASS_BRACKET_INSET_PX),
    );
    for (const bracket of brackets) {
      expect(bracket.getAttribute('vector-effect')).toBe('non-scaling-stroke');
      expect(bracket.getAttribute('fill')).toBe('none');
      expect(bracket.getAttribute('class')).toContain('stroke-gray-400');
    }
  });

  it('is aria-hidden, inert, text-free decoration', () => {
    const { svg } = renderFrame();
    expect(svg.getAttribute('aria-hidden')).toBe('true');
    expect(svg.getAttribute('class')).toContain('pointer-events-none');
    expect(svg.textContent).toBe('');
    expect(svg.querySelectorAll('a, text, title, [tabindex]')).toHaveLength(0);
  });

  it('redraws to the new size when the card resizes', () => {
    const { svg } = renderFrame();
    act(() => ro.trigger(svg, { width: 300, height: 900 }));
    expect(svg.getAttribute('viewBox')).toBe('0 0 300 900');
    expect(svg.querySelector('polygon')?.getAttribute('points')).toBe(chamferFramePoints(300, 900, GLASS_CHAMFER_PX, 0.5));
    expect(svg.querySelectorAll('polyline')[0]?.getAttribute('points')).toBe(chamferBracketPoints(300, 900, GLASS_BRACKET_ARM_PX, GLASS_BRACKET_INSET_PX)[0]);
  });
});
