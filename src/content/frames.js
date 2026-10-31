/**
 * Copy of frames 01 to 04. Every string comes from docs/copy-sources.md (status Verified or
 * Reworded, with the wording given there); do not add a claim without a source row.
 *
 * @typedef {object} FrameContent
 * @property {string} id - Section id, also the anchor.
 * @property {string} number - Two-digit frame number shown in the index chip.
 * @property {string} title
 * @property {'accent' | 'signal'} tone - Accent token of the frame: signal is the orange.
 * @property {{ label: string, value: string }} header - The `//LABEL_ value` row.
 * @property {readonly string[]} lines - Body lines.
 * @property {readonly { label: string, value: string }[]} [rows] - Extra data rows.
 */

/** Total frames shown in the index chip (00 is the text-free boot). */
export const FRAME_TOTAL = '05';

/** @type {readonly FrameContent[]} */
export const FRAMES = [
  {
    id: 'frame-01',
    number: '01',
    title: 'CEMPASÚCHIL',
    tone: 'signal',
    header: { label: 'FUNCIÓN', value: 'GUÍA DE ALMAS' },
    lines: [
      'Se cree que su aroma guía a las almas hasta la ofrenda.',
      'Se cree que sus pétalos iluminan el camino de las almas.',
      'Del náhuatl cempohualxóchitl: veinte flores.',
    ],
  },
  {
    id: 'frame-02',
    number: '02',
    title: 'OFRENDA',
    tone: 'accent',
    header: { label: 'NIVELES', value: '2 · 3 · 7 — VARÍAN POR REGIÓN' },
    lines: ['2 niveles: cielo y tierra.', '3 niveles: cielo, tierra e inframundo.'],
    rows: [
      { label: 'AGUA', value: 'Se cree que calma la sed de las almas tras su viaje.' },
      { label: 'SAL', value: 'Elemento de purificación.' },
      { label: 'VELAS', value: 'Se cree que guían a los muertos de regreso a su hogar.' },
      { label: 'COPAL', value: 'Se usa para limpiar el lugar de malos espíritus.' },
      { label: 'PAN', value: 'Uno de los elementos más preciados del altar.' },
    ],
  },
  {
    id: 'frame-03',
    number: '03',
    title: 'PAPEL PICADO',
    tone: 'accent',
    header: { label: 'ELEMENTO', value: 'AIRE' },
    lines: ['Papel picado de San Salvador Huixcolotla, Puebla.', 'Representa el aire.'],
  },
  {
    id: 'frame-04',
    number: '04',
    title: 'CALAVERA',
    tone: 'accent',
    header: { label: 'FECHA', value: '01–02.NOV' },
    lines: [
      'José Guadalupe Posada creó la Calavera Garbancera.',
      'Garbancera: así se llamaba a quienes vendían garbanza.',
      'Diego Rivera la nombró Catrina en su mural de 1947.',
    ],
  },
];
