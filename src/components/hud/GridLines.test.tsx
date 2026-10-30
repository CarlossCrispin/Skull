import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { GridLines } from './GridLines.tsx';

function grid(props: Parameters<typeof GridLines>[0]): HTMLElement {
  const { container } = render(<GridLines {...props} />);
  return container.firstElementChild as HTMLElement;
}

describe('GridLines', () => {
  it('is decorative, inert and text-free', () => {
    const root = grid({ vertical: ['25%'], horizontal: ['50%'] });
    expect(root.getAttribute('aria-hidden')).toBe('true');
    expect(root).toHaveClass('pointer-events-none');
    expect(root).toHaveClass('absolute', 'inset-0');
    expect(root.textContent).toBe('');
  });

  it('draws one 1 px gray-200 line per position, like the page grid', () => {
    const root = grid({ vertical: ['20%', '80%'], horizontal: ['30%'] });
    const vertical = [...root.querySelectorAll<HTMLElement>('[data-grid="line-v"]')];
    const horizontal = [...root.querySelectorAll<HTMLElement>('[data-grid="line-h"]')];
    expect(vertical.map((line) => line.style.left)).toEqual(['20%', '80%']);
    expect(horizontal.map((line) => line.style.top)).toEqual(['30%']);
    for (const line of vertical) {
      expect(line).toHaveClass('border-l', 'border-gray-200', 'inset-y-0');
    }
    for (const line of horizontal) {
      expect(line).toHaveClass('border-t', 'border-gray-200', 'inset-x-0');
    }
  });

  it('puts a centered 10 px plus mark at every intersection', () => {
    const root = grid({ vertical: ['20%', '80%'], horizontal: ['30%', '60%'] });
    const marks = [...root.querySelectorAll<HTMLElement>('[data-grid="mark"]')];
    expect(marks.map((mark) => [mark.style.left, mark.style.top])).toEqual([
      ['20%', '30%'],
      ['20%', '60%'],
      ['80%', '30%'],
      ['80%', '60%'],
    ]);
    for (const mark of marks) {
      expect(mark).toHaveClass('size-2.5', '-translate-x-1/2', '-translate-y-1/2');
      expect(mark.querySelectorAll('.border-gray-200')).toHaveLength(2);
    }
  });

  it('draws nothing when there are no positions', () => {
    const root = grid({ vertical: [], horizontal: [] });
    expect(root.children).toHaveLength(0);
  });

  it('uses no gradients, shadows or transparency effects', () => {
    const html = grid({ vertical: ['10%'], horizontal: ['10%'] }).outerHTML;
    expect(html).not.toMatch(/gradient|shadow|blur|opacity|(bg|border|text)-[\w-]+\/\d+/);
  });
});
