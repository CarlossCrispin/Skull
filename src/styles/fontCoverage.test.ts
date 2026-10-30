import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/** The rendered page copy of the skull-only baseline (the visually hidden h1); later frames append theirs. */
const TITLE = 'Protocolo Ofrenda';

type Range = readonly [number, number];

function parseRanges(unicodeRange: string): Range[] {
  return unicodeRange.split(',').map((part) => {
    const [start = '', end = start] = part.trim().replace(/^U\+/i, '').split('-');
    return [Number.parseInt(start, 16), Number.parseInt(end.replace(/^U\+/i, ''), 16)] as const;
  });
}

function uncovered(text: string, ranges: readonly Range[]): string[] {
  const missing = new Set<string>();
  for (const char of text) {
    const code = char.codePointAt(0) as number;
    if (!ranges.some(([from, to]) => code >= from && code <= to)) missing.add(char);
  }
  return [...missing];
}

/** The latin-400.css entry point ships the woff2 whose coverage equals the package's `latin` subset. */
function shippedLatinRanges(packageName: string): Range[] {
  const css = readFileSync('src/styles/index.css', 'utf8');
  expect(css).toContain(`@import "@fontsource/${packageName}/latin-400.css";`);
  const unicode = JSON.parse(readFileSync(`node_modules/@fontsource/${packageName}/unicode.json`, 'utf8')) as Record<string, string>;
  return parseRanges(unicode.latin as string);
}

const COPY = [TITLE.toUpperCase(), TITLE].join('\n');

describe('font coverage of the approved copy', () => {
  it('covers every code point with the Anton latin subset', () => {
    expect(uncovered(COPY, shippedLatinRanges('anton'))).toEqual([]);
  });

  it('covers every code point with the JetBrains Mono latin subset', () => {
    expect(uncovered(COPY, shippedLatinRanges('jetbrains-mono'))).toEqual([]);
  });

  it('detects code points outside the subset', () => {
    const ranges = shippedLatinRanges('anton');
    expect(uncovered('abc Ω → 💀', ranges).sort()).toEqual(['Ω', '→', '💀'].sort());
  });
});
