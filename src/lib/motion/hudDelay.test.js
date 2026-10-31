import { describe, expect, it } from 'vitest';
import { HUD_STAGGER_MS, hudDelay } from './hudDelay.js';

describe('hudDelay', () => {
  it('turns a stagger index into an inline animation delay', () => {
    expect(hudDelay(0)).toEqual({ animationDelay: '0ms' });
    expect(hudDelay(3)).toEqual({ animationDelay: `${3 * HUD_STAGGER_MS}ms` });
  });

  it('adds a base delay before the stagger', () => {
    expect(hudDelay(2, 400)).toEqual({ animationDelay: `${400 + 2 * HUD_STAGGER_MS}ms` });
  });
});
