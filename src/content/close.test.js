import { describe, expect, it } from 'vitest';
import { CLOSE } from './close.js';

describe('close frame content (docs/copy-sources.md, frame 05)', () => {
  it('is frame 05 with a neutral title', () => {
    expect([CLOSE.id, CLOSE.number, CLOSE.title]).toEqual(['frame-05', '05', 'CIERRE']);
  });

  it('carries only the verified UNESCO claim and the date row', () => {
    expect(CLOSE.heritage).toEqual({
      label: 'PATRIMONIO',
      value: 'UNESCO',
      line: 'Inscrita por la UNESCO en 2008 (proclamada en 2003).',
    });
    expect(CLOSE.date).toEqual({ label: 'FECHA', value: '01–02.NOV' });
    expect(JSON.stringify(CLOSE)).not.toMatch(/obra maestra|fraternidad|nació/i);
  });

  it('signs as Carlos Crispin with an Instagram link', () => {
    expect(CLOSE.author).toEqual({ label: 'AUTOR', value: 'CARLOS CRISPIN', barcodeSeed: 'CARLOS CRISPIN' });
    expect(CLOSE.link).toEqual({
      text: '@carloscrispin.cc',
      href: 'https://www.instagram.com/carloscrispin.cc/',
      ariaLabel: 'Instagram de Carlos Crispin (se abre en una pestaña nueva)',
    });
  });
});
