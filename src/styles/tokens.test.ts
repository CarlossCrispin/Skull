import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { COLORS } from './tokens.ts';

const css = readFileSync('src/styles/index.css', 'utf8');

function themeBlock(source: string): string {
  const start = source.indexOf('@theme');
  expect(start).toBeGreaterThanOrEqual(0);
  const open = source.indexOf('{', start);
  let depth = 0;
  for (let i = open; i < source.length; i++) {
    if (source[i] === '{') depth++;
    if (source[i] === '}') depth--;
    if (depth === 0) return source.slice(open + 1, i);
  }
  throw new Error('Unterminated @theme block');
}

function declarations(block: string): Map<string, string> {
  const map = new Map<string, string>();
  for (const match of block.matchAll(/(--[\w*-]+)\s*:\s*([^;]+);/g)) {
    map.set(match[1] as string, (match[2] as string).trim());
  }
  return map;
}

const theme = declarations(themeBlock(css));

describe('approved color tokens', () => {
  it('exports exactly the eight approved colors with exact hex values', () => {
    expect(COLORS).toEqual({
      bg: '#F8F8F8',
      'bg-alt': '#EDEDED',
      ink: '#0A0A0A',
      'gray-700': '#2B2B2C',
      'gray-400': '#888888',
      'gray-200': '#D8D8D8',
      accent: '#8E4AF2',
      signal: '#E2680A',
    });
  });

  it('mirrors tokens.ts in the @theme block', () => {
    const themed = Object.fromEntries(
      [...theme.entries()]
        .filter(([name]) => name.startsWith('--color-') && name !== '--color-*')
        .map(([name, value]) => [name.replace('--color-', ''), value.toUpperCase()]),
    );
    expect(themed).toEqual(COLORS);
  });
});

describe('theme resets', () => {
  it.each([
    '--color-*',
    '--font-*',
    '--radius-*',
    '--shadow-*',
    '--inset-shadow-*',
    '--drop-shadow-*',
    '--text-shadow-*',
    '--blur-*',
  ])('resets %s to initial', (name) => {
    expect(theme.get(name)).toBe('initial');
  });

  it('does not override breakpoints or spacing', () => {
    expect([...theme.keys()].filter((name) => name.startsWith('--breakpoint-'))).toEqual([]);
    expect(theme.has('--spacing')).toBe(false);
  });

  it('defines the approved font families', () => {
    expect(theme.get('--font-display')).toBe('"Anton", sans-serif');
    expect(theme.get('--font-mono')).toBe('"JetBrains Mono", monospace');
  });
});

describe('display scale', () => {
  it('keeps the body token at 14 px', () => {
    expect(Number.parseFloat(theme.get('--text-body') ?? '')).toBe(14);
  });

  it('sets the verse as a fluid clamp from 0.8125rem to 1.3rem, capped by viewport height, with leading 1.45', () => {
    expect(theme.get('--text-verse')).toBe('clamp(0.8125rem, min(1rem + 0.5vw, 2svh), 1.3rem)');
    expect(theme.get('--text-verse--line-height')).toBe('1.45');
  });

  it('sets the display as a fluid clamp from 1.75rem to 5.5rem, capped by viewport height, with leading 1.05', () => {
    expect(theme.get('--text-display')).toBe('clamp(1.75rem, min(1rem + 7vw, 5svh), 5.5rem)');
    expect(theme.get('--leading-display')).toBe('1.05');
  });

  it('makes the title visibly larger than the verse at every width', () => {
    const clampOf = (value: string) => {
      const match = /^clamp\(\s*([\d.]+)rem,\s*(.+),\s*([\d.]+)rem\s*\)$/.exec(value);
      expect(match, value).not.toBeNull();
      return { min: Number(match?.[1]) * 16, max: Number(match?.[3]) * 16 };
    };
    const verse = clampOf(theme.get('--text-verse') ?? '');
    const display = clampOf(theme.get('--text-display') ?? '');
    expect(verse.min).toBe(13);
    expect(verse.max).toBeCloseTo(20.8, 5);
    expect(display.min).toBeGreaterThanOrEqual(verse.min * 2);
    expect(display.max).toBeGreaterThanOrEqual(verse.max * 3);
  });

  it('no longer carries the full-width clamps', () => {
    expect(css).not.toContain('11.5vw');
    expect(css).not.toContain('0.9rem + 1.6vw');
  });

  it('removes both measures from the theme and from every authored class', () => {
    expect(theme.has('--measure-poem')).toBe(false);
    expect(theme.has('--measure-title')).toBe(false);
    expect(css).not.toMatch(/--measure-/);
  });

  it('no longer defines a text-verse utility: the theme token generates it', () => {
    expect(css).not.toMatch(/@utility text-verse/);
  });
});

describe('forbidden palette', () => {
  function sourceFiles(dir: string): string[] {
    return readdirSync(dir).flatMap((entry) => {
      const path = join(dir, entry);
      return statSync(path).isDirectory() ? sourceFiles(path) : [path];
    });
  }

  it('contains no legacy lime accent anywhere under src/', () => {
    const forbidden = ['E1F8', '58'].join('').toLowerCase();
    const files = sourceFiles('src');
    expect(files.length).toBeGreaterThan(3);
    const offenders = files.filter((file) => readFileSync(file, 'utf8').toLowerCase().includes(forbidden));
    expect(offenders).toEqual([]);
  });
});
