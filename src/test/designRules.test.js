import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

// Source scan of authored UI code for design-system prohibitions. Excluded: tests, the scene
// (GPU colour math) and auditCss.js, which lists the forbidden named colours as data.
const SRC = resolve(process.cwd(), 'src');
const EXCLUDED = [/\.test\./, /[\\/]test[\\/]/, /[\\/]scene[\\/]/, /auditCss\.js$/];

const sources = (readdirSync(SRC, { recursive: true, encoding: 'utf8' }))
  .filter((file) => /\.(js|jsx|css)$/.test(file) && !EXCLUDED.some((rule) => rule.test(`/${file}`)))
  .map((file) => [file, readFileSync(resolve(SRC, file), 'utf8')]);

const LIME = new RegExp(['E1F8', '58'].join(''), 'i');
const html = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8');
const all = [...sources, ['index.html', html]];

function classLists(text) {
  return [...text.matchAll(/class(?:Name)?=(?:"([^"]*)"|\{`([^`]*)`\}|'([^']*)')/g)].map(
    (match) => match[1] ?? match[2] ?? match[3] ?? '',
  );
}

describe('design rules source scan', () => {
  it('scans real files', () => {
    expect(sources.length).toBeGreaterThan(10);
  });

  it('never uses bg-signal without text-ink in the same class list', () => {
    const offenders = all.flatMap(([file, text]) =>
      classLists(text)
        .filter((list) => /\bbg-signal\b/.test(list) && !/\btext-ink\b/.test(list))
        .map((list) => `${file}: ${list}`),
    );
    expect(offenders).toEqual([]);
  });

  it('has no white literals', () => {
    const offenders = all
      .filter(([, text]) => /#fff(?:fff)?\b|\bwhite\b|rgba?\(\s*255/i.test(text))
      .map(([file]) => file);
    expect(offenders).toEqual([]);
  });

  it('keeps the glass panel the only element with a translucent frost background [Amendment B]', () => {
    const frosted = sources.flatMap(([file, text]) =>
      classLists(text)
        .filter((list) => /\bglass-frost\b/.test(list))
        .map(() => file),
    );
    expect(frosted).toEqual(['components/glass/GlassPanel.jsx']);
    const mixes = sources
      .filter(([file]) => file.endsWith('.css'))
      .flatMap(([, text]) => [...text.matchAll(/color-mix\([^;]*;/g)].map((match) => match[0]));
    expect(mixes).toHaveLength(1);
    expect(mixes[0]).toMatch(/#F8F8F8 72%, transparent/);
  });

  it('draws the glass card frame as a grey SVG stroke, with no CSS border on the card', () => {
    const panelLists = sources.flatMap(([file, text]) =>
      classLists(text)
        .filter((list) => /\bglass-panel\b/.test(list))
        .map((list) => ({ file, list })),
    );
    expect(panelLists).toHaveLength(1);
    expect(panelLists[0].list).not.toMatch(/\bborder\b|\bborder-[\w-]+/);
    const strokes = sources.flatMap(([, text]) => classLists(text).flatMap((list) => list.match(/\bstroke-[\w-]+/g) ?? []));
    expect(strokes).toEqual(['stroke-gray-400', 'stroke-gray-400']);
  });

  it('keeps every section transparent: only the glass frost layer tints the poem area', () => {
    const offenders = sources
      .filter(([file]) => file.startsWith('components'))
      .flatMap(([file, text]) =>
        classLists(text)
          .filter((list) => /\b(section|z-10)\b/.test(list) && /\bbg-[\w-]+/.test(list))
          .map((list) => `${file}: ${list}`),
      );
    expect(offenders).toEqual([]);
  });

  it('does not paint sections with bg-ink or bg-gray-700', () => {
    const offenders = all.flatMap(([file, text]) =>
      classLists(text)
        .filter((list) => /\bbg-(ink|gray-700)\b/.test(list))
        .map((list) => `${file}: ${list}`),
    );
    expect(offenders).toEqual([]);
  });

  it('never paints a section or component with bg-bg: the body owns the single light surface [A5]', () => {
    const offenders = sources
      .filter(([file]) => file.startsWith('components'))
      .flatMap(([file, text]) =>
        classLists(text)
          .filter((list) => /\bbg-bg\b/.test(list))
          .map((list) => `${file}: ${list}`),
      );
    expect(offenders).toEqual([]);
  });

  it('limits Tailwind opacity classes to the canvas fade in the skull layer [A1]', () => {
    const used = sources.flatMap(([file, text]) =>
      classLists(text)
        .flatMap((list) => list.match(/\bopacity-\d+\b|\b(?:bg|text|border)-[\w-]+\/\d+\b/g) ?? [])
        .map((match) => `${file}: ${match}`),
    );
    expect(used.length).toBeGreaterThan(0);
    expect(used.every((entry) => entry.startsWith('components/skull-hero/SkullHero.jsx: opacity-'))).toBe(true);
  });

  it('never uses the rejected legacy lime', () => {
    const offenders = all.filter(([, text]) => LIME.test(text)).map(([file]) => file);
    expect(offenders).toEqual([]);
  });
});
