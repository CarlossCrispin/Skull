import { describe, expect, it } from 'vitest';
import { mutedColor } from './mute.js';

function bytes(hex) {
  const value = Number.parseInt(hex.slice(1), 16);
  return [(value >> 16) & 0xff, (value >> 8) & 0xff, value & 0xff];
}

describe('mutedColor', () => {
  it('returns the input at amount 0 (assembled cubes keep their exact colour)', () => {
    expect(mutedColor('#8E4AF2', 0)).toBe('#8E4AF2');
    expect(mutedColor('#2B2B2C', 0)).toBe('#2B2B2C');
  });

  it('lifts near-black to at least #888888 per channel at amount 1', () => {
    for (const channel of bytes(mutedColor('#2B2B2C', 1))) {
      expect(channel).toBeGreaterThanOrEqual(0x88);
    }
    expect(mutedColor('#2B2B2C', 1)).toBe('#9C9C9C');
  });

  it('desaturates then lightens violet toward #BBB2C9 at amount 1', () => {
    expect(mutedColor('#8E4AF2', 1)).toBe('#BBB2C9');
  });

  it('interpolates linearly between the input and the fully muted colour', () => {
    const full = bytes(mutedColor('#8E4AF2', 1));
    const input = bytes('#8E4AF2');
    const half = bytes(mutedColor('#8E4AF2', 0.5));
    half.forEach((channel, i) => {
      expect(Math.abs(channel - ((input[i]) + (full[i])) / 2)).toBeLessThanOrEqual(0.5);
    });
  });

  it('honours custom desaturate and lighten amounts', () => {
    expect(mutedColor('#000000', 1, 0, 0.5)).toBe('#7C7C7C');
    expect(mutedColor('#FF0000', 1, 1, 0)).toBe('#363636');
  });

  it('is deterministic and returns uppercase #RRGGBB', () => {
    expect(mutedColor('#8e4af2', 0.37)).toBe(mutedColor('#8E4AF2', 0.37));
    expect(mutedColor('#8E4AF2', 0.37)).toMatch(/^#[0-9A-F]{6}$/);
  });
});
