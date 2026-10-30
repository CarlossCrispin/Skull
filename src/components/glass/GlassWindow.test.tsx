import { render } from '@testing-library/react';
import { useRef } from 'react';
import { describe, expect, it } from 'vitest';
import { GLASS_COPY_OVERSCAN_PX } from '../../lib/glass/constants.ts';
import { createFrameMirror } from '../../lib/glass/frameMirror.ts';
import { installResizeObserverStub } from '../../test/stubs.ts';
import { GlassWindow } from './GlassWindow.tsx';

function Harness() {
  const panelRef = useRef<HTMLDivElement>(null);
  return (
    <div ref={panelRef} data-testid="panel">
      <GlassWindow panelRef={panelRef} mirror={createFrameMirror()} suspended={false} />
    </div>
  );
}

describe('GlassWindow structure', () => {
  it('is an aria-hidden fixed-window decoration with a single copy canvas and no text', () => {
    installResizeObserverStub();
    const { getByTestId } = render(<Harness />);
    const panel = getByTestId('panel');
    const windows = panel.querySelectorAll('.glass-window');
    expect(windows).toHaveLength(1);
    const glassWindow = windows[0] as HTMLElement;
    expect(glassWindow.getAttribute('aria-hidden')).toBe('true');
    expect(glassWindow.parentElement).toBe(panel);
    const canvases = glassWindow.querySelectorAll('canvas.glass-copy');
    expect(canvases).toHaveLength(1);
    expect(glassWindow.children).toHaveLength(1);
    expect(glassWindow.textContent).toBe('');
    expect(glassWindow.querySelectorAll('a, button, input, [tabindex]')).toHaveLength(0);
  });

  it('carries no transform, filter or perspective utility classes of its own', () => {
    installResizeObserverStub();
    const { getByTestId } = render(<Harness />);
    const glassWindow = getByTestId('panel').querySelector('.glass-window') as HTMLElement;
    expect(glassWindow.className).not.toMatch(/transform|translate|filter|perspective|will-change|contain-/);
  });

  it('nests the viewport copy directly in the clip and puts no effect style on the clip', () => {
    installResizeObserverStub();
    const { getByTestId } = render(<Harness />);
    const clip = getByTestId('panel').querySelector('.glass-window') as HTMLElement;
    const copy = clip.querySelector('canvas.glass-copy') as HTMLCanvasElement;
    expect(copy.parentElement).toBe(clip);
    expect(clip.style.filter).toBe('');
    expect(clip.style.transform).toBe('');
    // The copy is the viewport plus the overscan on every side, not the panel the clip is cropped to.
    expect(copy.style.width).toBe(`${window.innerWidth + 2 * GLASS_COPY_OVERSCAN_PX}px`);
    expect(copy.style.height).toBe(`${window.innerHeight + 2 * GLASS_COPY_OVERSCAN_PX}px`);
  });
});
