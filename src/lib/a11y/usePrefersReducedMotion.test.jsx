import { act, render } from '@testing-library/react';
import { StrictMode } from 'react';
import { describe, expect, it } from 'vitest';
import { installMatchMediaStub } from '../../test/stubs.js';
import { usePrefersReducedMotion } from './usePrefersReducedMotion.js';

const QUERY = '(prefers-reduced-motion: reduce)';

function Probe({ onRender }) {
  const value = usePrefersReducedMotion();
  onRender?.(value);
  return <output>{String(value)}</output>;
}

describe('usePrefersReducedMotion', () => {
  it('reads the initial value synchronously, on the first render', () => {
    installMatchMediaStub({ [QUERY]: true });
    const seen = [];
    render(<Probe onRender={(value) => seen.push(value)} />);
    expect(seen[0]).toBe(true);
  });

  it('is false when the query does not match', () => {
    installMatchMediaStub({ [QUERY]: false });
    const { container } = render(<Probe />);
    expect(container.querySelector('output')?.textContent).toBe('false');
  });

  it('updates consumers on a live change event', () => {
    const stub = installMatchMediaStub({ [QUERY]: false });
    const { container } = render(<Probe />);
    act(() => stub.setMatches(QUERY, true));
    expect(container.querySelector('output')?.textContent).toBe('true');
  });

  it('removes its listener on unmount', () => {
    const stub = installMatchMediaStub({ [QUERY]: false });
    const { unmount } = render(<Probe />);
    expect(stub.listenerCount(QUERY)).toBe(1);
    unmount();
    expect(stub.listenerCount(QUERY)).toBe(0);
    expect(() => stub.setMatches(QUERY, true)).not.toThrow();
  });

  it('is StrictMode safe: one live listener, still reactive', () => {
    const stub = installMatchMediaStub({ [QUERY]: false });
    const { container, unmount } = render(
      <StrictMode>
        <Probe />
      </StrictMode>,
    );
    expect(stub.listenerCount(QUERY)).toBe(1);
    act(() => stub.setMatches(QUERY, true));
    expect(container.querySelector('output')?.textContent).toBe('true');
    unmount();
    expect(stub.listenerCount(QUERY)).toBe(0);
  });
});
