import { describe, expect, it } from 'vitest';
import { FRAMES } from './frames.js';

const ALL_TEXT = JSON.stringify(FRAMES);

describe('frame content (docs/copy-sources.md)', () => {
  it('holds frames 01 to 04 in order with their titles', () => {
    expect(FRAMES.map((frame) => [frame.id, frame.number, frame.title])).toEqual([
      ['frame-01', '01', 'CEMPASÚCHIL'],
      ['frame-02', '02', 'OFRENDA'],
      ['frame-03', '03', 'PAPEL PICADO'],
      ['frame-04', '04', 'CALAVERA'],
    ]);
  });

  it('uses the verified header rows', () => {
    expect(FRAMES.map((frame) => [frame.header.label, frame.header.value])).toEqual([
      ['FUNCIÓN', 'GUÍA DE ALMAS'],
      ['NIVELES', '2 · 3 · 7 — VARÍAN POR REGIÓN'],
      ['ELEMENTO', 'AIRE'],
      ['FECHA', '01–02.NOV'],
    ]);
  });

  it('paints frame 01 with the signal (orange) tone and the others with the accent', () => {
    expect(FRAMES.map((frame) => frame.tone)).toEqual(['signal', 'accent', 'accent', 'accent']);
  });

  it('keeps the reworded cempasúchil lines hedged with "se cree que"', () => {
    const [frame] = FRAMES;
    expect(frame.lines).toEqual([
      'Se cree que su aroma guía a las almas hasta la ofrenda.',
      'Se cree que sus pétalos iluminan el camino de las almas.',
      'Del náhuatl cempohualxóchitl: veinte flores.',
    ]);
  });

  it('gives the ofrenda the 2 and 3 level meanings and the five elements with the reworded copy', () => {
    const frame = FRAMES[1];
    expect(frame.lines).toEqual(['2 niveles: cielo y tierra.', '3 niveles: cielo, tierra e inframundo.']);
    expect(frame.rows).toEqual([
      { label: 'AGUA', value: 'Se cree que calma la sed de las almas tras su viaje.' },
      { label: 'SAL', value: 'Elemento de purificación.' },
      { label: 'VELAS', value: 'Se cree que guían a los muertos de regreso a su hogar.' },
      { label: 'COPAL', value: 'Se usa para limpiar el lugar de malos espíritus.' },
      { label: 'PAN', value: 'Uno de los elementos más preciados del altar.' },
    ]);
  });

  it('states the papel picado origin and the air element without a "nació" claim', () => {
    expect(FRAMES[2].lines).toContain('Papel picado de San Salvador Huixcolotla, Puebla.');
    expect(FRAMES[2].lines.some((line) => /aire/i.test(line))).toBe(true);
  });

  it('states the Posada, garbancera and Rivera 1947 lines', () => {
    expect(FRAMES[3].lines).toEqual([
      'José Guadalupe Posada creó la Calavera Garbancera.',
      'Garbancera: así se llamaba a quienes vendían garbanza.',
      'Diego Rivera la nombró Catrina en su mural de 1947.',
    ]);
  });

  it.each([
    /fraternidad/i,
    /nació/i,
    /indicación geográfica/i,
    /mictl[aá]n/i,
    /obra maestra/i,
    /\b1910\b/,
    /ni[ñn]os/i,
    /siete niveles/i,
  ])('never ships a "do not ship" claim (%s)', (pattern) => {
    expect(ALL_TEXT).not.toMatch(pattern);
  });
});
