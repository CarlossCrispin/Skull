import { afterEach, describe, expect, it } from 'vitest';
import { installMatchMediaStub } from '../../test/stubs.js';
import { isTouchOnly, TOUCH_ONLY_QUERY } from './touchOnly.js';

describe('isTouchOnly', () => {
  const original = window.matchMedia;

  afterEach(() => {
    window.matchMedia = original;
  });

  it('asks for a device whose primary pointer is coarse and cannot hover', () => {
    expect(TOUCH_ONLY_QUERY).toBe('(hover: none) and (pointer: coarse)');
  });

  it('is true when the touch-only query matches', () => {
    installMatchMediaStub({ [TOUCH_ONLY_QUERY]: true });
    expect(isTouchOnly()).toBe(true);
  });

  it('is false on a device with a fine or hovering pointer', () => {
    installMatchMediaStub({ [TOUCH_ONLY_QUERY]: false });
    expect(isTouchOnly()).toBe(false);
  });

  it('is false when matchMedia is unavailable', () => {
    window.matchMedia = undefined;
    expect(isTouchOnly()).toBe(false);
  });
});
