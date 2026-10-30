import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { GLASS_CHAMFER_PX, GLASS_FILTER_ID } from '../lib/glass/constants.js';
import { auditCss } from './auditCss.js';

const css = readFileSync('src/styles/index.css', 'utf8');
const authored = css.replace(/\/\*[\s\S]*?\*\//g, '');

function utility(name) {
  const body = new RegExp(`@utility ${name}\\s*\\{([^}]*)\\}`).exec(authored)?.[1] ?? '';
  const declarations = new Map();
  for (const decl of body.matchAll(/([-\w]+)\s*:\s*([^;]+);/g)) {
    declarations.set(decl[1], (decl[2]).trim());
  }
  return declarations;
}

describe('glass window stylesheet', () => {
  const glassWindow = utility('glass-window');
  const copy = utility('glass-copy');

  it('is a fixed, inert clip container that hides everything outside the panel box', () => {
    expect(glassWindow.get('position')).toBe('fixed');
    expect(glassWindow.get('pointer-events')).toBe('none');
    expect(glassWindow.get('overflow')).toBe('hidden');
  });

  it('puts no filter, background or compositing property on the clip, so its edges never refract', () => {
    for (const property of ['filter', 'background-color', 'transform', 'perspective', 'will-change', 'contain']) {
      expect(glassWindow.has(property), property).toBe(false);
    }
  });

  it('applies the refraction reference to the viewport copy, which the clip then crops', () => {
    expect(copy.get('filter')).toBe(`url(#${GLASS_FILTER_ID})`);
  });

  it('keeps the glass reference the only filter in the authored stylesheet', () => {
    const filters = [...authored.matchAll(/(?<![\w-])filter\s*:\s*([^;]+);/g)].map((match) => (match[1]).trim());
    expect(filters).toEqual([`url(#${GLASS_FILTER_ID})`]);
    expect(authored).not.toMatch(/backdrop-filter/);
  });

  it('places the copy canvas at the window origin so the translate aligns it with the viewport', () => {
    const copy = utility('glass-copy');
    expect(copy.get('position')).toBe('absolute');
    expect(copy.get('left')).toBe('0');
    expect(copy.get('top')).toBe('0');
    expect(copy.get('display')).toBe('block');
    expect(copy.get('max-width')).toBe('none');
  });

  it('passes the stylesheet audit', () => {
    expect(auditCss(css)).toEqual([]);
  });

  it('keeps Tailwind from scanning the filter definition, whose element name would emit a utility', () => {
    expect(authored).toContain('@source not "../components/glass/LiquidGlassFilter.jsx";');
  });
});

describe('glass card stylesheet (Decision 45)', () => {
  const panel = utility('glass-panel');
  const c = GLASS_CHAMFER_PX;

  it('cuts the top-left and bottom-right corners of the card with a clip-path polygon', () => {
    expect(panel.get('clip-path')).toBe(
      `polygon(${c}px 0, 100% 0, 100% calc(100% - ${c}px), calc(100% - ${c}px) 100%, 0 100%, 0 ${c}px)`,
    );
  });

  it('keeps the card square-cornered and free of border, radius and shadow declarations', () => {
    for (const property of ['border', 'border-radius', 'box-shadow', 'backdrop-filter']) {
      expect(panel.has(property), property).toBe(false);
    }
  });
});

describe('chamfer-clip utility', () => {
  it('cuts the same two corners as the glass card, so a frost layer cannot show outside the chamfer', () => {
    const c = GLASS_CHAMFER_PX;
    expect(utility('chamfer-clip').get('clip-path')).toBe(
      `polygon(${c}px 0, 100% 0, 100% calc(100% - ${c}px), calc(100% - ${c}px) 100%, 0 100%, 0 ${c}px)`,
    );
  });
});

