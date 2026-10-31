import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { GridOverlay } from './GridOverlay.jsx';

function overlay() {
  const { container } = render(<GridOverlay />);
  return container.firstElementChild;
}

describe('GridOverlay', () => {
  it('is decorative and inert', () => {
    const root = overlay();
    expect(root.getAttribute('aria-hidden')).toBe('true');
    expect(root.classList.contains('pointer-events-none')).toBe(true);
  });

  it('is marked so the page composition can find it', () => {
    expect(overlay().hasAttribute('data-grid-overlay')).toBe(true);
  });

  it('is a fixed full-viewport layer, not part of the document flow', () => {
    const root = overlay();
    expect(root.classList.contains('fixed')).toBe(true);
    expect(root.classList.contains('inset-0')).toBe(true);
    expect(root.classList.contains('absolute')).toBe(false);
  });

  it('has no text nodes', () => {
    expect(overlay().textContent).toBe('');
  });

  it('draws 1 px gray-200 lines and plus crosshairs from bordered elements', () => {
    const root = overlay();
    const lines = root.querySelectorAll('[data-grid="line"]');
    const crosshairs = root.querySelectorAll('[data-grid="crosshair"]');
    expect(lines.length).toBeGreaterThan(0);
    expect(crosshairs.length).toBeGreaterThan(0);
    for (const line of lines) {
      expect(line.className).toMatch(/\bborder-(l|t)\b/);
      expect(line.classList.contains('border-gray-200')).toBe(true);
    }
    for (const mark of crosshairs) {
      expect(mark.querySelectorAll('.border-gray-200').length).toBe(2);
    }
  });

  it('uses no gradients, shadows or transparency effects', () => {
    const html = overlay().outerHTML;
    expect(html).not.toMatch(/gradient|shadow|opacity|blur|(bg|border|text)-[\w-]+\/\d+/);
  });
});
