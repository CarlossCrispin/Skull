import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const html = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8');
const doc = new DOMParser().parseFromString(html, 'text/html');

describe('index.html', () => {
  it('declares Spanish as the document language', () => {
    expect(doc.documentElement.getAttribute('lang')).toBe('es');
  });

  it('uses the approved title verbatim', () => {
    expect(doc.title).toBe('Cyberpunk Skull · CarlosCrispin · Día de Muertos');
  });

  it('has a short Spanish meta description about the concept', () => {
    const description = doc.querySelector('meta[name="description" i]')?.getAttribute('content') ?? '';
    expect(description).toBe('Un concepto ciberpunk del Día de Muertos: una calavera de vóxeles, paneles HUD y una ofrenda hecha de datos.');
  });

  it('references no external hosts', () => {
    const urls = [...doc.querySelectorAll('link[href], script[src]')].map(
      (node) => node.getAttribute('href') ?? node.getAttribute('src') ?? '',
    );
    expect(urls.length).toBeGreaterThan(0);
    for (const url of urls) expect(url).not.toMatch(/^(https?:)?\/\//i);
  });

  it('has a single #root mount point', () => {
    expect(doc.querySelectorAll('#root')).toHaveLength(1);
    expect(doc.querySelectorAll('[id]').length).toBe(1);
  });
});
