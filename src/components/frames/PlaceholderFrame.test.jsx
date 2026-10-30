import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PlaceholderFrame, PLACEHOLDER_FRAME_ID } from './PlaceholderFrame.jsx';

describe('PlaceholderFrame', () => {
  it('is the frame-00 section holding the only h1, in Spanish', () => {
    const { container } = render(<PlaceholderFrame reducedMotion={false} revealGate />);
    const section = container.firstElementChild;
    expect(section.tagName).toBe('SECTION');
    expect(section.id).toBe('frame-00');
    expect(PLACEHOLDER_FRAME_ID).toBe('frame-00');
    expect(container.querySelectorAll('h1')).toHaveLength(1);
    expect(section.querySelector('h1')?.textContent).toBe('Protocolo Ofrenda');
  });

  it('fills one viewport, stays transparent so the cubes show through, and has no interactive content', () => {
    const { container } = render(<PlaceholderFrame reducedMotion={false} revealGate />);
    const section = container.firstElementChild;
    expect(section).toHaveClass('min-h-svh');
    expect(section.classList.contains('bg-bg')).toBe(false);
    expect(section.querySelectorAll('a[href], button, input, [tabindex]')).toHaveLength(0);
  });

  it('shows no visible text: only the screen-reader heading', () => {
    const { container } = render(<PlaceholderFrame reducedMotion={false} revealGate />);
    expect(container.querySelector('h1')).toHaveClass('sr-only');
    expect(container.querySelectorAll('section > *:not(h1)')).toHaveLength(0);
  });
});
