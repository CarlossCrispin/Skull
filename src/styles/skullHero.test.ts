import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { STAGE_SCALE } from '../scene/constants.ts';
import { POSTER_EXTENT } from '../scene/poster/rasterize.ts';
import { auditCss } from './auditCss.ts';

const css = readFileSync('src/styles/index.css', 'utf8');

function utilityBody(name: string): string {
  const match = new RegExp(`@utility ${name}\\s*\\{([^}]*)\\}`).exec(css);
  expect(match, `@utility ${name} exists`).not.toBeNull();
  return (match as RegExpExecArray)[1] as string;
}

describe('skull hero stylesheet', () => {
  it('makes the 3D layer a fixed, inert, clipped size container sized in lvh', () => {
    const body = utilityBody('skull-layer');
    expect(body).toContain('position: fixed');
    expect(body).toContain('pointer-events: none');
    expect(body).toContain('overflow: hidden');
    expect(body).toContain('container-type: size');
    expect(body).toMatch(/height:\s*100vh;[\s\S]*height:\s*100lvh/);
    expect(body).toMatch(/width:\s*100%/);
  });

  it('no longer defines the Block A stage', () => {
    expect(css).not.toMatch(/@utility skull-stage/);
  });

  it('draws the backdrop at the DEFAULT-PENDING 0.3 opacity', () => {
    expect(utilityBody('skull-backdrop')).toMatch(/opacity:\s*0\.3\b/);
  });

  it('draws the full poster (static path inside the range) at full opacity under the new name', () => {
    expect(utilityBody('skull-full')).toMatch(/opacity:\s*1\b/);
  });

  it('no longer defines the old hold frame utility', () => {
    expect(css).not.toMatch(/@utility skull-hold/);
  });

  it('sizes the poster as STAGE_SCALE x POSTER_EXTENT of the short container side', () => {
    const body = utilityBody('skull-poster-box');
    const factor = STAGE_SCALE * POSTER_EXTENT;
    for (const property of ['width', 'height']) {
      const match = new RegExp(`${property}:\\s*calc\\(min\\(100cqw,\\s*100cqh\\)\\s*\\*\\s*([\\d.]+)\\)`).exec(body);
      expect(match, `${property} in ${body}`).not.toBeNull();
      expect(Number(match![1])).toBeCloseTo(factor, 9);
    }
    expect(factor).toBeCloseTo(1.428, 9);
  });

  it('cross-fades with opacity only, over 500 ms', () => {
    const body = utilityBody('skull-fade');
    expect(body).toMatch(/transition-property:\s*opacity/);
    expect(body).toContain('transition-duration: 500ms');
    expect(body).not.toMatch(/transform|width|height|top|left/);
  });

  it('drops the poster-gone fade: the backdrop is simply hidden or shown', () => {
    expect(css).not.toMatch(/@utility skull-poster-gone/);
  });

  it('keeps the compiled-style policy: no gradient, shadow or off-palette color', () => {
    expect(auditCss(css)).toEqual([]);
    expect(css).not.toMatch(/gradient\(/);
  });
});
