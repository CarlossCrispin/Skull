import { render } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { GLASS_FILTER_ID } from '../../lib/glass/constants.ts';
import { LiquidGlassFilter } from './LiquidGlassFilter.tsx';

function mount() {
  const { container } = render(<LiquidGlassFilter />);
  const svg = container.querySelector('svg') as SVGSVGElement;
  const filter = svg.querySelector('filter') as SVGFilterElement;
  const children = [...filter.children];
  return { container, svg, filter, children };
}

const tags = (nodes: Element[]) => nodes.map((node) => node.tagName);
const matrixRows = (node: Element): string[][] => {
  const values = (node.getAttribute('values') ?? '').trim().split(/\s+/);
  return [0, 1, 2, 3].map((row) => values.slice(row * 5, row * 5 + 5));
};

describe('LiquidGlassFilter definition', () => {
  it('is an inline, hidden, zero-size svg holding the one refraction filter', () => {
    const { container, svg, filter } = mount();
    expect(container.querySelectorAll('svg')).toHaveLength(1);
    expect(svg.getAttribute('aria-hidden')).toBe('true');
    expect(svg.getAttribute('width')).toBe('0');
    expect(svg.getAttribute('height')).toBe('0');
    expect(svg.querySelectorAll('filter')).toHaveLength(1);
    expect(filter.id).toBe(GLASS_FILTER_ID);
    expect(filter.id).toBe('liquid-glass-refraction');
  });

  it('uses the user filter region and sRGB interpolation', () => {
    const { filter } = mount();
    expect(filter.getAttribute('x')).toBe('-30%');
    expect(filter.getAttribute('y')).toBe('-30%');
    expect(filter.getAttribute('width')).toBe('160%');
    expect(filter.getAttribute('height')).toBe('160%');
    expect(filter.getAttribute('color-interpolation-filters')).toBe('sRGB');
  });

  it('chains the primitives in order: noise, edge mask, map, three displaced channels, two blends', () => {
    const { children } = mount();
    expect(tags(children)).toEqual([
      'feTurbulence',
      'feColorMatrix',
      'feGaussianBlur',
      'feComponentTransfer',
      'feComposite',
      'feDisplacementMap',
      'feColorMatrix',
      'feDisplacementMap',
      'feColorMatrix',
      'feDisplacementMap',
      'feColorMatrix',
      'feBlend',
      'feBlend',
    ]);
  });

  it('generates fractal noise at the user frequency and octaves', () => {
    const { filter } = mount();
    const turbulence = filter.querySelector('feTurbulence') as Element;
    expect(turbulence.getAttribute('type')).toBe('fractalNoise');
    expect(turbulence.getAttribute('baseFrequency')).toBe('0.012 0.015');
    expect(turbulence.getAttribute('numOctaves')).toBe('3');
  });

  it('builds the edge mask from the boosted source alpha, a 45 px blur and an inverted linear alpha ramp', () => {
    const { children } = mount();
    const boost = children[1] as Element;
    expect(boost.getAttribute('in')).toBe('SourceAlpha');
    expect(boost.getAttribute('type')).toBe('matrix');
    expect(matrixRows(boost)[3]).toEqual(['0', '0', '0', '100', '0']);
    expect(matrixRows(boost).slice(0, 3).flat().every((value) => value === '0')).toBe(true);

    const blur = children[2] as Element;
    expect(blur.getAttribute('stdDeviation')).toBe('45');
    expect(blur.getAttribute('in')).toBe(boost.getAttribute('result'));

    const transfer = children[3] as Element;
    const alpha = transfer.querySelector('feFuncA') as Element;
    expect(alpha.getAttribute('type')).toBe('linear');
    expect(alpha.getAttribute('slope')).toBe('-1.3');
    expect(alpha.getAttribute('intercept')).toBe('1');
    expect(transfer.getAttribute('in')).toBe(blur.getAttribute('result'));
  });

  it('multiplies the noise by the mask with an arithmetic composite (k1 = 1, others 0)', () => {
    const { children } = mount();
    const composite = children[4] as Element;
    expect(composite.getAttribute('operator')).toBe('arithmetic');
    expect(composite.getAttribute('k1')).toBe('1');
    for (const name of ['k2', 'k3', 'k4']) expect(composite.getAttribute(name)).toBe('0');
    expect(composite.getAttribute('in')).toBe(children[0]!.getAttribute('result'));
    expect(composite.getAttribute('in2')).toBe(children[3]!.getAttribute('result'));
  });

  it('displaces the source graphic three times with scales 65, 56 and 47 using R and G', () => {
    const { children } = mount();
    const maps = children.filter((node) => node.tagName === 'feDisplacementMap');
    expect(maps.map((node) => node.getAttribute('scale'))).toEqual(['65', '56', '47']);
    const composite = children[4] as Element;
    for (const map of maps) {
      expect(map.getAttribute('in')).toBe('SourceGraphic');
      expect(map.getAttribute('in2')).toBe(composite.getAttribute('result'));
      expect(map.getAttribute('xChannelSelector')).toBe('R');
      expect(map.getAttribute('yChannelSelector')).toBe('G');
    }
  });

  it('isolates each displaced pass to R, G and B and keeps alpha', () => {
    const { children } = mount();
    const isolations = [6, 8, 10].map((index) => children[index] as Element);
    const maps = [5, 7, 9].map((index) => children[index] as Element);
    isolations.forEach((isolation, channel) => {
      expect(isolation.getAttribute('in')).toBe(maps[channel]!.getAttribute('result'));
      const rows = matrixRows(isolation);
      rows.slice(0, 3).forEach((row, rowIndex) => {
        const keptColumn = rowIndex === channel ? channel : -1;
        expect(row).toEqual(['0', '1', '2', '3', '4'].map((_, col) => (col === keptColumn ? '1' : '0')));
      });
      expect(rows[3]).toEqual(['0', '0', '0', '1', '0']);
    });
  });

  it('recombines R+G then adds B with two screen blends', () => {
    const { children } = mount();
    const [first, second] = [children[11] as Element, children[12] as Element];
    expect(first.getAttribute('mode')).toBe('screen');
    expect(second.getAttribute('mode')).toBe('screen');
    expect(first.getAttribute('in')).toBe(children[6]!.getAttribute('result'));
    expect(first.getAttribute('in2')).toBe(children[8]!.getAttribute('result'));
    expect(second.getAttribute('in')).toBe(first.getAttribute('result'));
    expect(second.getAttribute('in2')).toBe(children[10]!.getAttribute('result'));
  });

  it('marks the values the user did not give as design fills in the source', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/components/glass/LiquidGlassFilter.tsx'), 'utf8');
    expect(source).toMatch(/design fill/i);
  });
});
