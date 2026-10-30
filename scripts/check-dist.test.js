// @vitest-environment node
import { gzipSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import {
  auditDistCss,
  containsWebGLRenderer,
  entryChunkFile,
  modulePreloadHrefs,
  preloadRule,
  posterReport,
  totalGzipBytes,
} from './check-dist.js';

describe('totalGzipBytes', () => {
  it('sums the gzip size of every chunk', () => {
    const a = 'const a = 1;\n'.repeat(200);
    const b = 'export const b = "x";\n'.repeat(300);
    const expected = gzipSync(a).length + gzipSync(b).length;
    expect(totalGzipBytes([a, b])).toBe(expected);
  });

  it('is zero for no chunks', () => {
    expect(totalGzipBytes([])).toBe(0);
  });
});

describe('containsWebGLRenderer', () => {
  it('detects the renderer symbol in a chunk', () => {
    expect(containsWebGLRenderer('class WebGLRenderer{}')).toBe(true);
  });

  it('is false for a chunk without it', () => {
    expect(containsWebGLRenderer('import("./SkullScene-abc.js")')).toBe(false);
  });
});

describe('entryChunkFile', () => {
  it('reads the entry module script from the built html', () => {
    const html = '<script type="module" crossorigin src="/assets/index-DnYDpZqL.js"></script>';
    expect(entryChunkFile(html)).toBe('index-DnYDpZqL.js');
  });

  it('throws when no entry script exists', () => {
    expect(() => entryChunkFile('<html></html>')).toThrow(/entry/i);
  });
});

describe('auditDistCss', () => {
  it('reports no violations for clean css', () => {
    expect(auditDistCss('a{color:#0A0A0A;border-radius:0}')).toEqual([]);
  });

  it('delegates to auditCss and reports offenders', () => {
    const violations = auditDistCss('a{border-radius:8px}');
    expect(violations.map((v) => v.rule)).toEqual(['border-radius']);
  });
});

describe('posterReport', () => {
  it('flags a poster within the 60 KB budget', () => {
    expect(posterReport(32_517)).toEqual({ bytes: 32_517, budgetBytes: 61_440, withinBudget: true });
  });

  it('flags a poster over budget', () => {
    expect(posterReport(61_441).withinBudget).toBe(false);
  });
});

describe('modulePreloadHrefs', () => {
  it('lists every modulepreload href, in order, whatever the attribute order', () => {
    const html =
      '<link rel="modulepreload" crossorigin href="/assets/SkullScene-a.js">' +
      '<link href="/assets/three-b.js" rel="modulepreload" crossorigin>' +
      '<link rel="stylesheet" href="/assets/index.css">';
    expect(modulePreloadHrefs(html)).toEqual(['assets/SkullScene-a.js', 'assets/three-b.js']);
  });

  it('is empty when the page has no modulepreload hint', () => {
    expect(modulePreloadHrefs('<link rel="stylesheet" href="/assets/index.css">')).toEqual([]);
  });
});

describe('preloadRule', () => {
  const read = (files) => (file) => files[file] ?? '';

  it('passes when the preloaded set contains the renderer', () => {
    const result = preloadRule(['assets/SkullScene-a.js', 'assets/three-b.js'], read({ 'assets/three-b.js': 'class WebGLRenderer{}' }));
    expect(result).toEqual({ ok: true, reason: 'preloaded set contains WebGLRenderer' });
  });

  it('fails when no modulepreload exists', () => {
    expect(preloadRule([], read({}))).toEqual({ ok: false, reason: 'no modulepreload hint in dist/index.html' });
  });

  it('fails when the preloaded set lacks the renderer (hint points at the entry or the wrong chunk)', () => {
    const result = preloadRule(['assets/index-a.js'], read({ 'assets/index-a.js': 'import("./x.js")' }));
    expect(result).toEqual({ ok: false, reason: 'preloaded chunks do not contain WebGLRenderer' });
  });
});
