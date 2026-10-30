import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync('src/styles/index.css', 'utf8');
const EXPO_OUT = 'cubic-bezier(0.16, 1, 0.3, 1)';

function block(source: string, header: string): string {
  const start = source.indexOf(header);
  expect(start, header).toBeGreaterThanOrEqual(0);
  let depth = 0;
  for (let i = source.indexOf('{', start); i < source.length; i++) {
    if (source[i] === '{') depth++;
    if (source[i] === '}' && --depth === 0) return source.slice(source.indexOf('{', start) + 1, i);
  }
  throw new Error(`unbalanced block: ${header}`);
}

const UTILITIES = [
  'hud-fade-up',
  'hud-slide-left',
  'hud-slide-right',
  'hud-scale-in',
  'hud-grid-v',
  'hud-grid-h',
  'hud-draw-line',
] as const;

describe('HUD entrance utilities', () => {
  it.each(UTILITIES)('%s starts hidden, runs once with expo-out and keeps its end state', (name) => {
    const body = block(css, `@utility ${name} `);
    expect(body).toMatch(/opacity:\s*0;/);
    expect(body).toContain(`animation: ${name} `);
    expect(body).toContain(EXPO_OUT);
    expect(body).toMatch(/forwards;/);
  });

  it.each(UTILITIES)('%s renders at its end state under reduced motion', (name) => {
    const body = block(css, `@utility ${name} `);
    const reduced = block(body, '@media (prefers-reduced-motion: reduce)');
    expect(reduced).toMatch(/animation:\s*none;/);
    expect(reduced).toMatch(/opacity:\s*1;/);
  });

  it.each(UTILITIES)('has a %s keyframe ending fully visible', (name) => {
    const frames = block(css, `@keyframes ${name} `);
    expect(frames).toMatch(/from\s*{[^}]*opacity:\s*0/);
    expect(block(frames, 'to ')).toMatch(/opacity:\s*1/);
  });

  it('moves the specified distances and scale', () => {
    expect(block(css, '@keyframes hud-fade-up ')).toContain('translateY(18px)');
    expect(block(css, '@keyframes hud-slide-left ')).toContain('translateX(20px)');
    expect(block(css, '@keyframes hud-slide-right ')).toContain('translateX(-20px)');
    expect(block(css, '@keyframes hud-scale-in ')).toContain('scale(0.85)');
    expect(block(css, '@keyframes hud-grid-v ')).toContain('scaleY(0)');
    expect(block(css, '@keyframes hud-grid-h ')).toContain('scaleX(0)');
  });

  it('wipes lines in with a clip, not a dash, so the non-scaling stroke is untouched', () => {
    expect(block(css, '@keyframes hud-draw-line ')).toContain('clip-path: inset(0 100% 0 0)');
    expect(css).not.toMatch(/stroke-dash/);
  });
});
