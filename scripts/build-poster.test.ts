// @vitest-environment node
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { POSTER_SIZE } from '../src/scene/poster/rasterize.ts';
import { decodeIndexedPng } from '../src/test/pngDecode.ts';
import { buildPosterPng } from './build-poster.ts';

const COMMITTED = new URL('../public/poster.png', import.meta.url);
const BUDGET_BYTES = 60 * 1024;
const SLOW = 60_000;

describe('buildPosterPng', () => {
  it('is deterministic across two runs', () => {
    const first = buildPosterPng();
    const second = buildPosterPng();
    expect(first.length).toBeGreaterThan(1000);
    expect(Buffer.from(first).equals(Buffer.from(second))).toBe(true);
  }, SLOW);

  it('stays within the 60 KB poster budget', () => {
    expect(buildPosterPng().length).toBeLessThanOrEqual(BUDGET_BYTES);
  }, SLOW);

  it('yields a transparent-background indexed PNG of the poster size with the skull drawn', () => {
    const decoded = decodeIndexedPng(buildPosterPng());
    expect([decoded.width, decoded.height]).toEqual([POSTER_SIZE, POSTER_SIZE]);
    expect(decoded.alpha[0]).toBe(0);
    expect(decoded.alpha.slice(1).every((a) => a === 255)).toBe(true);
    expect(decoded.pixels[0]).toBe(0);
    const center = decoded.pixels[(POSTER_SIZE / 2) * POSTER_SIZE + POSTER_SIZE / 2]!;
    expect(center).not.toBe(0);
    const drawn = decoded.pixels.reduce((n, p) => n + (p === 0 ? 0 : 1), 0);
    expect(drawn).toBeGreaterThan(POSTER_SIZE * POSTER_SIZE * 0.05);
    expect(drawn).toBeLessThan(POSTER_SIZE * POSTER_SIZE * 0.6);
  }, SLOW);

  it('equals the committed public/poster.png byte for byte', () => {
    const committed = readFileSync(COMMITTED);
    expect(Buffer.from(buildPosterPng()).equals(committed)).toBe(true);
    expect(committed.length).toBeLessThanOrEqual(BUDGET_BYTES);
  }, SLOW);
});
