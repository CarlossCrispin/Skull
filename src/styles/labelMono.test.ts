import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync('src/styles/index.css', 'utf8');

function utilityDeclarations(name: string): Map<string, string> {
  const start = css.indexOf(`@utility ${name}`);
  expect(start).toBeGreaterThanOrEqual(0);
  const open = css.indexOf('{', start);
  const close = css.indexOf('}', open);
  const map = new Map<string, string>();
  for (const match of css.slice(open + 1, close).matchAll(/([-\w]+)\s*:\s*([^;]+);/g)) {
    map.set(match[1] as string, (match[2] as string).trim());
  }
  return map;
}

const px = (value: string | undefined): number => Number.parseFloat(value ?? 'NaN');

describe('label-mono utility', () => {
  const label = utilityDeclarations('label-mono');

  it('is uppercase mono text with 0.15em tracking', () => {
    expect(label.get('font-family')).toBe('var(--font-mono)');
    expect(label.get('letter-spacing')).toBe('0.15em');
    expect(label.get('text-transform')).toBe('uppercase');
  });

  it('has a font size between 10 and 11 px', () => {
    expect(label.get('font-size')).toMatch(/px$/);
    expect(px(label.get('font-size'))).toBeGreaterThanOrEqual(10);
    expect(px(label.get('font-size'))).toBeLessThanOrEqual(11);
  });
});

describe('numeral-mono utility (removed with the numerals)', () => {
  it('is gone from the stylesheet', () => {
    expect(css).not.toContain('numeral-mono');
  });

  it('has no authored /0n numeral strings', () => {
    expect(css).not.toMatch(/\/0[1-9]/);
  });
});

describe('text-verse from the theme token', () => {
  const theme = css.slice(css.indexOf('@theme'), css.indexOf('@layer base'));

  it('is generated from --text-verse with a 1.45 line height, not from a custom utility', () => {
    expect(theme).toMatch(/--text-verse:\s*clamp\(0\.8125rem,/);
    expect(theme).toMatch(/--text-verse--line-height:\s*1\.45;/);
    expect(css).not.toContain('@utility text-verse');
  });

  it('has no breakpoint step left: the size is fluid', () => {
    expect(css).not.toMatch(/font-size:\s*1\.75rem/);
  });
});
