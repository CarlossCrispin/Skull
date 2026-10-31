import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Barcode } from './Barcode.jsx';

function bars(seed) {
  const { container } = render(<Barcode seed={seed} />);
  return [...container.querySelectorAll('rect')].map((rect) => `${rect.getAttribute('x')}:${rect.getAttribute('width')}`);
}

describe('Barcode', () => {
  it('is a decorative svg in the ink token', () => {
    const { container } = render(<Barcode seed="MICTLAN" />);
    const svg = container.querySelector('svg');
    expect(svg.getAttribute('aria-hidden')).toBe('true');
    expect(svg).toHaveClass('text-ink');
    expect(svg.textContent).toBe('');
    for (const rect of svg.querySelectorAll('rect')) {
      expect(rect.getAttribute('fill')).toBe('currentColor');
    }
  });

  it('renders the same bars for the same seed and different bars for another', () => {
    expect(bars('MICTLAN')).toEqual(bars('MICTLAN'));
    expect(bars('MICTLAN').length).toBeGreaterThan(10);
    expect(bars('MICTLAN')).not.toEqual(bars('OFRENDA'));
  });

  it('scales to its box with a stretched view box', () => {
    const { container } = render(<Barcode seed="MICTLAN" className="h-8 w-40" />);
    const svg = container.querySelector('svg');
    expect(svg.getAttribute('preserveAspectRatio')).toBe('none');
    expect(svg.getAttribute('viewBox')).toMatch(/^0 0 \d+ \d+$/);
    expect(svg).toHaveClass('h-8', 'w-40');
  });
});
