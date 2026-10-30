import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { SCATTER_MUTE_DESATURATE, SCATTER_MUTE_LIGHTEN } from '../scene/constants.ts';
import * as contrast from './contrast.ts';
import {
  CUBE_COLORS,
  MIN_TEXT_CONTRAST,
  contrastRatio,
  frostedOver,
  worstMutedContrast,
  relativeLuminance,
} from './contrast.ts';
import { mutedColor } from '../scene/scatter/mute.ts';
import { COLORS } from './tokens.ts';

describe('contrastRatio', () => {
  it('matches known WCAG vectors', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 5);
    expect(contrastRatio('#FFFFFF', '#000000')).toBeCloseTo(21, 5);
    expect(contrastRatio('#777777', '#FFFFFF')).toBeCloseTo(4.48, 2);
    expect(contrastRatio(COLORS.ink, COLORS.bg)).toBeCloseTo(18.6, 1);
  });

  it('is 1 for identical colors and computes relative luminance per channel', () => {
    expect(contrastRatio('#888888', '#888888')).toBe(1);
    expect(relativeLuminance('#FF0000')).toBeCloseTo(0.2126, 4);
    expect(relativeLuminance('#00FF00')).toBeCloseTo(0.7152, 4);
  });
});

describe('cube colors behind text', () => {
  it('lists every cube color the scene can place behind text', () => {
    expect(CUBE_COLORS).toEqual(
      expect.arrayContaining([COLORS.accent, COLORS.signal, COLORS['gray-700'], COLORS['gray-200'], '#000000']),
    );
    expect(MIN_TEXT_CONTRAST).toBe(4.5);
  });

  it('no longer exports the dim helpers', () => {
    for (const removed of ['dimRectStrengths', 'dimmedBackground', 'worstTextContrast']) {
      expect(removed in contrast, removed).toBe(false);
    }
  });
});

describe('text over muted cubes', () => {
  it('keeps the lighten amount at or above the 0.5 floor', () => {
    expect(SCATTER_MUTE_LIGHTEN).toBeGreaterThanOrEqual(0.5);
    expect(SCATTER_MUTE_DESATURATE).toBe(0.7);
  });

  it('gives ink at least 4.5:1 on every fully muted cube colour, with and without the 72 % frost', () => {
    for (const cube of CUBE_COLORS) {
      const muted = mutedColor(cube, 1);
      expect(contrastRatio(COLORS.ink, muted), `${cube} -> ${muted}`).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST);
      expect(contrastRatio(COLORS.ink, frostedOver(muted)), `${cube} frosted`).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST);
    }
  });

  it('reports the near-black worst case (about 5.6:1, above 12:1 with frost)', () => {
    expect(worstMutedContrast()).toBeGreaterThanOrEqual(5.5);
    expect(worstMutedContrast()).toBeLessThan(5.9);
    expect(worstMutedContrast(true)).toBeGreaterThanOrEqual(12);
  });

  it('keeps ink at AAA (7:1) over every unmuted cube colour seen through the frost', () => {
    for (const cube of CUBE_COLORS) {
      expect(contrastRatio(COLORS.ink, frostedOver(cube)), cube).toBeGreaterThanOrEqual(7);
    }
  });

  it('discriminates: a lighten below the floor fails for near-black', () => {
    expect(worstMutedContrast(false, 0.55)).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST);
    expect(worstMutedContrast(false, 0.3)).toBeLessThan(MIN_TEXT_CONTRAST);
  });
});

describe('accent is never text', () => {
  function sourceFiles(dir: string): string[] {
    return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) return sourceFiles(path);
      return /\.(ts|tsx|css)$/.test(entry.name) && !/\.test\./.test(entry.name) ? [path] : [];
    });
  }

  it('uses --color-accent as text color nowhere in authored sources', () => {
    const files = sourceFiles('src');
    expect(files.length).toBeGreaterThan(10);
    for (const file of files) {
      const text = readFileSync(file, 'utf8');
      expect(text, file).not.toMatch(/text-accent|(?<![-\w])color\s*:\s*var\(--color-accent\)/);
    }
  });
});
