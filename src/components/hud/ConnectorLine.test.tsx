import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ConnectorLine, ElbowConnector } from './ConnectorLine.tsx';

describe('ConnectorLine', () => {
  it('is a decorative full-bleed svg with one 1 px non-scaling line in percent', () => {
    const { container } = render(<ConnectorLine x1={10} y1={20} x2={60} y2={80} />);
    const svg = container.querySelector('svg') as SVGSVGElement;
    expect(svg.getAttribute('aria-hidden')).toBe('true');
    expect(svg).toHaveClass('pointer-events-none', 'absolute', 'inset-0', 'h-full', 'w-full');
    const lines = svg.querySelectorAll('line');
    expect(lines).toHaveLength(1);
    const line = lines[0] as SVGLineElement;
    expect(['x1', 'y1', 'x2', 'y2'].map((name) => line.getAttribute(name))).toEqual(['10%', '20%', '60%', '80%']);
    expect(line.getAttribute('stroke-width')).toBe('1');
    expect(line.getAttribute('vector-effect')).toBe('non-scaling-stroke');
    expect(line.getAttribute('stroke')).toBe('currentColor');
    expect(svg).toHaveClass('text-gray-400');
    expect(svg.textContent).toBe('');
  });
});

describe('ElbowConnector', () => {
  it('runs horizontally from the source to the elbow, then diagonally into the target', () => {
    const { container } = render(<ElbowConnector from={{ x: 5, y: 40 }} to={{ x: 50, y: 70 }} elbowX={30} />);
    const lines = [...container.querySelectorAll('line')];
    const coords = lines.map((line) => ['x1', 'y1', 'x2', 'y2'].map((name) => line.getAttribute(name)));
    expect(coords).toEqual([
      ['5%', '40%', '30%', '40%'],
      ['30%', '40%', '50%', '70%'],
    ]);
  });

  it('is two decorative connector svgs', () => {
    const { container } = render(<ElbowConnector from={{ x: 5, y: 40 }} to={{ x: 50, y: 70 }} elbowX={30} />);
    const svgs = container.querySelectorAll('svg');
    expect(svgs).toHaveLength(2);
    for (const svg of svgs) {
      expect(svg.getAttribute('aria-hidden')).toBe('true');
    }
  });
});

describe('ConnectorLine entrance', () => {
  it('is static unless it draws', () => {
    const { container } = render(<ConnectorLine x1={0} y1={0} x2={10} y2={10} />);
    expect(container.querySelector('svg')?.getAttribute('class')).not.toContain('hud-draw-line');
  });

  it('wipes in after its delay when drawn', () => {
    const { container } = render(<ConnectorLine x1={0} y1={0} x2={10} y2={10} draw delayMs={300} />);
    const svg = container.querySelector('svg') as SVGSVGElement;
    expect(svg).toHaveClass('hud-draw-line');
    expect(svg.style.animationDelay).toBe('300ms');
  });

  it('draws the elbow run first and the diagonal right after it', () => {
    const { container } = render(<ElbowConnector from={{ x: 5, y: 40 }} to={{ x: 50, y: 70 }} elbowX={30} draw delayMs={100} />);
    const delays = [...container.querySelectorAll('svg')].map((svg) => svg.style.animationDelay);
    expect(delays).toEqual(['100ms', '260ms']);
  });
});
