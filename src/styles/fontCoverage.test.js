import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { FRAMES } from '../content/frames.js';

/** The rendered page copy of the baseline (the visually hidden h1); later frames append theirs. */
const TITLE = 'Protocolo Ofrenda';

function parseRanges(unicodeRange) {
  return unicodeRange.split(',').map((part) => {
    const [start = '', end = start] = part.trim().replace(/^U\+/i, '').split('-');
    return [Number.parseInt(start, 16), Number.parseInt(end.replace(/^U\+/i, ''), 16)];
  });
}

function uncovered(text, ranges) {
  const missing = new Set();
  for (const char of text) {
    const code = char.codePointAt(0);
    if (!ranges.some(([from, to]) => code >= from && code <= to)) missing.add(char);
  }
  return [...missing];
}

/** The latin-400.css entry point ships the woff2 whose coverage equals the package's `latin` subset. */
function shippedLatinRanges(packageName) {
  const css = readFileSync('src/styles/index.css', 'utf8');
  expect(css).toContain(`@import "@fontsource/${packageName}/latin-400.css";`);
  const unicode = JSON.parse(readFileSync(`node_modules/@fontsource/${packageName}/unicode.json`, 'utf8'));
  return parseRanges(unicode.latin);
}

const FRAME_COPY = FRAMES.flatMap((frame) => [
  frame.title,
  frame.header.label,
  frame.header.value,
  ...frame.lines,
  ...(frame.rows ?? []).flatMap((row) => [row.label, row.value]),
]);
// Anton sets the titles and JetBrains Mono the rest; checking everything against both is the strict bound.
const COPY = [TITLE.toUpperCase(), TITLE, ...FRAME_COPY, ...FRAME_COPY.map((text) => text.toUpperCase())].join('\n');

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
