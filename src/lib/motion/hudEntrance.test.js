import { describe, expect, it } from 'vitest';
import { hudEntrance } from './hudEntrance.js';

describe('hudEntrance', () => {
  it('keeps the element hidden but in layout before the gate opens', () => {
    expect(hudEntrance('hud-fade-up', { revealGate: false, reducedMotion: false }, 400)).toEqual({
      className: 'invisible',
      style: undefined,
    });
  });

  it('applies the utility with the delay once the gate is open', () => {
    expect(hudEntrance('hud-fade-up', { revealGate: true, reducedMotion: false }, 400)).toEqual({
      className: 'hud-fade-up',
      style: { animationDelay: '400ms' },
    });
  });

  it('shows the element at once under reduced motion, gate open or not', () => {
    for (const revealGate of [true, false]) {
      expect(hudEntrance('hud-fade-up', { revealGate, reducedMotion: true }, 400)).toEqual({
        className: '',
        style: undefined,
      });
    }
  });

  it('defaults to no delay', () => {
    expect(hudEntrance('hud-scale-in', { revealGate: true, reducedMotion: false }).style).toEqual({
      animationDelay: '0ms',
    });
  });
});
