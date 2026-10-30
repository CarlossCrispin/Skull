import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/** The rendered page copy: the h1 plus the strings of each frame, appended as the frames land. */
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

// Frame 00 (boot hero): nav, subline, nodes, CTA and info card.
const FRAME_00_COPY = [
  'PROTOCOLO // OFRENDA',
  '01. CEMPASÚCHIL',
  '02. OFRENDA',
  '03. PAPEL_PICADO',
  '04. CALAVERA',
  '05. CIERRE',
  '//SYS_ MICTLAN.OS',
  'EN LÍNEA',
  'MENÚ',
  'CERRAR',
  'Navegación principal',
  'Día de Muertos · sistema de memoria',
  'DÍA DE MUERTOS · SISTEMA DE MEMORIA',
  '[ MICTLÁN ]',
  'Inframundo mexica de nueve niveles.',
  '[ UNESCO_2008 ]',
  'Patrimonio cultural inmaterial de la humanidad.',
  '[ COORD_ ]',
  '19.4326° N · 99.1332° O',
  'INICIAR PROTOCOLO',
  '//FECHA_ 01–02.NOV',
  'De fines de octubre a inicios de noviembre, la memoria se enciende.',
];

const COPY = [TITLE.toUpperCase(), TITLE, ...FRAME_00_COPY, ...FRAME_00_COPY.map((line) => line.toUpperCase())].join('\n');

describe('font coverage of the approved copy', () => {
  it('covers every code point with the Anton latin subset', () => {
    expect(uncovered(COPY, shippedLatinRanges('anton'))).toEqual([]);
  });

  it('covers every code point with the JetBrains Mono latin subset', () => {
    expect(uncovered(COPY, shippedLatinRanges('jetbrains-mono'))).toEqual([]);
  });

  // Reported, not swapped: the CTA glyph is outside both latin subsets, so the browser falls back to a system font for it.
  it('records the CTA star glyph as uncovered by both latin subsets', () => {
    expect(uncovered('✦', shippedLatinRanges('anton'))).toEqual(['✦']);
    expect(uncovered('✦', shippedLatinRanges('jetbrains-mono'))).toEqual(['✦']);
  });

  it('detects code points outside the subset', () => {
    const ranges = shippedLatinRanges('anton');
    expect(uncovered('abc Ω → 💀', ranges).sort()).toEqual(['Ω', '→', '💀'].sort());
  });
});
