import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DataRow } from './DataRow.tsx';

describe('DataRow', () => {
  it('is a group named by its label, so screen readers read label then value', () => {
    render(<DataRow label="SYS" value="MICTLAN.OS" />);
    const group = screen.getByRole('group', { name: 'SYS' });
    expect(group).toHaveTextContent('MICTLAN.OS');
  });

  it('shows the //LABEL_ markers as aria-hidden decoration', () => {
    const { container } = render(<DataRow label="SYS" value="MICTLAN.OS" />);
    expect(container.textContent).toContain('//SYS_');
    const hidden = [...container.querySelectorAll('[aria-hidden="true"]')].map((node) => node.textContent);
    expect(hidden).toEqual(expect.arrayContaining(['//', '_']));
  });

  it('sets the label in mono on the left and the value on the right of one row', () => {
    render(<DataRow label="FECHA" value="01-02.NOV" />);
    const label = screen.getByText('FECHA');
    const value = screen.getByText('01-02.NOV');
    expect(label.closest('[data-datarow-label]')).toHaveClass('label-mono');
    expect(value).toHaveClass('label-mono', 'text-right');
    expect(label.closest('[data-datarow-line]')).toBe(value.closest('[data-datarow-line]'));
    expect(value.closest('[data-datarow-line]')).toHaveClass('flex', 'justify-between');
  });

  it('draws a 1 px rule below with square dots at both ends, all decorative', () => {
    const { container } = render(<DataRow label="SYS" value="X" />);
    const rule = container.querySelector('[data-datarow-rule]') as HTMLElement;
    expect(rule.getAttribute('aria-hidden')).toBe('true');
    expect(rule).toHaveClass('border-t', 'border-gray-400');
    const dots = rule.querySelectorAll('[data-datarow-dot]');
    expect(dots).toHaveLength(2);
    expect(dots[0]).toHaveClass('left-0');
    expect(dots[1]).toHaveClass('right-0');
    expect(rule.outerHTML).not.toMatch(/rounded/);
  });

  it('gives each row its own accessible name', () => {
    render(
      <>
        <DataRow label="A" value="1" />
        <DataRow label="B" value="2" />
      </>,
    );
    expect(screen.getByRole('group', { name: 'A' })).toHaveTextContent('1');
    expect(screen.getByRole('group', { name: 'B' })).toHaveTextContent('2');
  });
});
