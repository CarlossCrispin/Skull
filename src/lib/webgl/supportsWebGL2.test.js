import { describe, expect, it, vi } from 'vitest';
import { supportsWebGL2 } from './supportsWebGL2.js';

function canvasWith(getContext) {
  return () => ({ getContext });
}

describe('supportsWebGL2', () => {
  it('returns true when a webgl2 context is available and releases it through WEBGL_lose_context', () => {
    const loseContext = vi.fn();
    const getExtension = vi.fn((name) => (name === 'WEBGL_lose_context' ? { loseContext } : null));
    const getContext = vi.fn(() => ({ getExtension }));

    expect(supportsWebGL2(canvasWith(getContext))).toBe(true);
    expect(getContext).toHaveBeenCalledWith('webgl2');
    expect(getExtension).toHaveBeenCalledWith('WEBGL_lose_context');
    expect(loseContext).toHaveBeenCalledTimes(1);
  });

  it('returns true even when the lose-context extension is missing', () => {
    const context = { getExtension: () => null };
    expect(supportsWebGL2(canvasWith(() => context))).toBe(true);
  });

  it('returns false when getContext returns null', () => {
    expect(supportsWebGL2(canvasWith(() => null))).toBe(false);
  });

  it('returns false when getContext throws', () => {
    const throwing = canvasWith(() => {
      throw new Error('blocked');
    });
    expect(supportsWebGL2(throwing)).toBe(false);
  });

  it('returns false in jsdom, which has no WebGL (default canvas factory)', () => {
    expect(supportsWebGL2()).toBe(false);
  });
});
