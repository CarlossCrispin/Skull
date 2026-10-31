import { describe, expect, it } from 'vitest';
import { CLOSE } from './close.js';

describe('close frame content (frame 05)', () => {
  it('is frame 05 with a visually hidden heading only', () => {
    expect([CLOSE.id, CLOSE.srTitle]).toEqual(['frame-05', 'Autor']);
  });

  it('carries only the signature: no chip number, title, heritage, date, countdown or barcode', () => {
    expect(Object.keys(CLOSE).sort()).toEqual(['author', 'id', 'link', 'srTitle']);
  });

  it('signs as Carlos Crispin with an Instagram link', () => {
    expect(CLOSE.author).toEqual({ label: 'AUTOR', value: 'CARLOS CRISPIN' });
    expect(CLOSE.link).toEqual({
      text: '@carloscrispin.cc',
      href: 'https://www.instagram.com/carloscrispin.cc/',
      ariaLabel: 'Instagram de Carlos Crispin (se abre en una pestaña nueva)',
    });
  });
});
