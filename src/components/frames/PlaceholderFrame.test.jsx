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

  it('shows no visible text: only the screen-reader heading and the icon-only scroll cue', () => {
    const { container } = render(<PlaceholderFrame reducedMotion={false} revealGate />);
    expect(container.querySelector('h1')).toHaveClass('sr-only');
    const others = [...container.querySelectorAll('section > *:not(h1)')];
    expect(others).toHaveLength(1);
    expect(others[0].textContent).toBe('');
  });

  it('paints above the fixed skull layer so the scroll cue is visible', () => {
    const { container } = render(<PlaceholderFrame reducedMotion={false} revealGate />);
    expect(container.firstElementChild).toHaveClass('relative', 'z-10');
  });

  it('holds the scroll cue back until the opening is done (after the explosion)', () => {
    const { container } = render(<PlaceholderFrame reducedMotion={false} revealGate={false} />);
    expect(container.querySelector('[data-reveal="indicator"]')).toBeNull();
  });

  it('shows the chevron at the bottom centre once the gate opens, fading in and bobbing', () => {
    const { container } = render(<PlaceholderFrame reducedMotion={false} revealGate />);
    const indicator = container.querySelector('[data-reveal="indicator"]');
    expect(indicator).not.toBeNull();
    expect(indicator.getAttribute('aria-hidden')).toBe('true');
    expect(indicator.parentElement).toHaveClass('absolute', 'inset-x-0', 'bottom-8', 'hud-fade-up');
    expect(container.querySelector('.indicator-bob')).not.toBeNull();
  });

  it('under reduced motion shows the chevron at once, without fade or bob', () => {
    const { container } = render(<PlaceholderFrame reducedMotion revealGate={false} />);
    const indicator = container.querySelector('[data-reveal="indicator"]');
    expect(indicator).not.toBeNull();
    expect(indicator.parentElement.classList.contains('hud-fade-up')).toBe(false);
    expect(container.querySelector('.indicator-bob')).toBeNull();
  });
});
