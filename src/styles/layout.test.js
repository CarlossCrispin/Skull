import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  CARD_CLASSES,
  CARD_MAX_WIDTH_PX,
  GUTTER_CLASSES,
  HUD_GUTTER_CLASSES,
  HUD_GUTTER_LEFT_CLASSES,
  HUD_GUTTER_RIGHT_CLASSES,
} from './layout.js';

/** Selectors of flat rules in `css` that declare `font-size`. */
function fontSizeSelectors(css) {
  const stripped = css.replace(/\/\*[\s\S]*?\*\//g, '');
  return [...stripped.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
    .filter((match) => /(^|[\s;])font-size\s*:/.test(match[2]))
    .map((match) => (match[1]).trim());
}

describe('layout constants', () => {
  it('uses the approved responsive gutters (20 / 32 / 48 px)', () => {
    expect(GUTTER_CLASSES).toBe('px-5 sm:px-8 md:px-12');
  });

  it('keeps the shared gutters untouched and adds the HUD frame gutter (20 px, 35 px from md)', () => {
    expect(GUTTER_CLASSES).toBe('px-5 sm:px-8 md:px-12');
    expect(HUD_GUTTER_CLASSES).toBe('px-5 md:px-[35px]');
    expect(HUD_GUTTER_LEFT_CLASSES).toBe('left-5 md:left-[35px]');
    expect(HUD_GUTTER_RIGHT_CLASSES).toBe('right-5 md:right-[35px]');
  });

  it('centers a card of at most 720 px: max-w-180 is 180 x 4 px, padded 24 / 40 px and 4 svh vertically', () => {
    expect(CARD_MAX_WIDTH_PX).toBe(720);
    expect(CARD_CLASSES.split(' ')).toEqual(
      expect.arrayContaining(['mx-auto', 'w-full', `max-w-${CARD_MAX_WIDTH_PX / 4}`, 'px-6', 'sm:px-10', 'py-[4svh]']),
    );
    expect(CARD_CLASSES).not.toMatch(/md:px-/);
    expect(CARD_CLASSES).not.toMatch(/(^|\s)(rounded|shadow|border)/);
  });

  // Gutters are rem-based, so they only measure 20 / 32 / 48 px at the default 16 px root.
  it('never sets font-size on html, keeping 1rem at the browser default', () => {
    const css = readFileSync('src/styles/index.css', 'utf8');
    const rootSelectors = fontSizeSelectors(css).filter((selector) =>
      selector.split(',').some((part) => /^(html|:root)$/.test(part.trim())),
    );
    expect(rootSelectors).toEqual([]);
  });
});
