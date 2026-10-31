import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { installIntersectionObserverStub } from '../../test/stubs.js';
import { FRAMES } from '../../content/frames.js';
import { PapelPicadoFrame } from './PapelPicadoFrame.jsx';

describe('PapelPicadoFrame', () => {
  it('renders frame-03 with its verified copy', () => {
    installIntersectionObserverStub();
    const frame = FRAMES[2];
    const { container } = render(<PapelPicadoFrame reducedMotion={false} revealGate />);
    const section = container.firstElementChild;
    expect(section.id).toBe(frame.id);
    expect(section.querySelector('h2')?.textContent).toBe(frame.title);
    for (const line of frame.lines) expect(section.textContent).toContain(line);
    expect(section.textContent).toContain(frame.header.value);
    for (const row of frame.rows ?? []) expect(section.textContent).toContain(row.value);
  });
});
