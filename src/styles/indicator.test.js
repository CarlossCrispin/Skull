import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync('src/styles/index.css', 'utf8');

/** Body of the first block that starts at `header`, braces balanced. */
function blockAfter(header) {
  const match = header.exec(css);
  expect(match, `missing ${header}`).not.toBeNull();
  const open = css.indexOf('{', match.index);
  let depth = 0;
  for (let i = open; i < css.length; i++) {
    if (css[i] === '{') depth++;
    if (css[i] === '}') depth--;
    if (depth === 0) return css.slice(open + 1, i);
  }
  throw new Error('unterminated block');
}

describe('indicator bob', () => {
  it('animates only transform', () => {
    const frames = blockAfter(/@keyframes indicator-bob/);
    const properties = [...frames.matchAll(/([-\w]+)\s*:/g)].map((match) => match[1]);
    expect(properties.length).toBeGreaterThan(0);
    expect(new Set(properties)).toEqual(new Set(['transform']));
  });

  it('applies the animation through the utility and switches it off under reduced motion', () => {
    const utility = blockAfter(/@utility indicator-bob/);
    expect(utility).toMatch(/animation:\s*indicator-bob\s+1\.6s[^;]*infinite/);
    expect(utility).toMatch(/@media \(prefers-reduced-motion: reduce\)\s*\{[^{}]*animation:\s*none/);
  });
});
