import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Ruler } from './Ruler.tsx';

function ruler(props: Parameters<typeof Ruler>[0] = {}) {
  const { container } = render(<Ruler {...props} />);
  return container.firstElementChild as HTMLElement;
}

describe('Ruler', () => {
  it('is decorative and inert', () => {
    const root = ruler();
    expect(root.getAttribute('aria-hidden')).toBe('true');
    expect(root).toHaveClass('pointer-events-none');
  });

  it('draws a tick every 5 from 0 to 100 and a label every 20', () => {
    const root = ruler();
    const ticks = [...root.querySelectorAll<HTMLElement>('[data-ruler-tick]')];
    expect(ticks).toHaveLength(21);
    expect(ticks.map((tick) => tick.dataset.rulerTick)).toEqual(Array.from({ length: 21 }, (_, i) => String(i * 5)));
    const labels = [...root.querySelectorAll('[data-ruler-label]')].map((label) => label.textContent);
    expect(labels).toEqual(['0', '20', '40', '60', '80', '100']);
  });

  it('places value 0 at the top and 100 at the bottom', () => {
    const root = ruler();
    const top = (value: number) =>
      (root.querySelector(`[data-ruler-tick="${value}"]`) as HTMLElement).style.top;
    expect(top(0)).toBe('0%');
    expect(top(50)).toBe('50%');
    expect(top(100)).toBe('100%');
  });

  it('makes the labelled ticks longer than the minor ones', () => {
    const root = ruler();
    expect(root.querySelector('[data-ruler-tick="20"]')).toHaveClass('w-4');
    expect(root.querySelector('[data-ruler-tick="5"]')).toHaveClass('w-2');
  });

  it('shows no indicator without progress', () => {
    expect(ruler().querySelector('[data-ruler-indicator]')).toBeNull();
  });

  it('places the indicator at the progress fraction, clamped to 0..1', () => {
    const at = (progress: number) =>
      (ruler({ progress }).querySelector('[data-ruler-indicator]') as HTMLElement).style.top;
    expect(at(0.25)).toBe('25%');
    expect(at(-1)).toBe('0%');
    expect(at(3)).toBe('100%');
  });
});
