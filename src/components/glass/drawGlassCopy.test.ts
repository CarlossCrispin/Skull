import { describe, expect, it } from 'vitest';
import { COLORS } from '../../styles/tokens.ts';
import { drawGlassCopy, GRID_FRACTIONS } from './drawGlassCopy.ts';

interface Op {
  readonly name: 'fillRect' | 'drawImage';
  readonly style: string;
  readonly args: readonly unknown[];
}

function fakeContext() {
  const ops: Op[] = [];
  let fillStyle = '';
  const ctx = {
    get fillStyle() {
      return fillStyle;
    },
    set fillStyle(value: string) {
      fillStyle = value;
    },
    fillRect: (...args: number[]) => ops.push({ name: 'fillRect', style: fillStyle, args }),
    drawImage: (...args: unknown[]) => ops.push({ name: 'drawImage', style: fillStyle, args }),
  };
  return { ctx: ctx as unknown as CanvasRenderingContext2D, ops };
}

const source = { tag: 'gl-canvas' } as unknown as HTMLCanvasElement;
const fills = (ops: Op[]) => ops.filter((op) => op.name === 'fillRect');

describe('drawGlassCopy', () => {
  it('fills the viewport with the bg token first', () => {
    const { ctx, ops } = fakeContext();
    drawGlassCopy(ctx, source, 1000, 800);
    expect(ops[0]).toEqual({ name: 'fillRect', style: COLORS.bg, args: [0, 0, 1000, 800] });
  });

  it('draws the grid lines at 1/4 and 3/4 in the gray-200 token, then the crosshairs', () => {
    const { ctx, ops } = fakeContext();
    drawGlassCopy(ctx, source, 1000, 800);
    expect(GRID_FRACTIONS).toEqual([0.25, 0.75]);
    const grid = fills(ops).slice(1);
    expect(grid.length).toBeGreaterThan(0);
    expect(grid.every((op) => op.style === COLORS['gray-200'])).toBe(true);
    const lines = grid.slice(0, 4).map((op) => op.args);
    expect(lines).toEqual([
      [250, 0, 1, 800],
      [750, 0, 1, 800],
      [0, 200, 1000, 1],
      [0, 600, 1000, 1],
    ]);
  });

  it('adds a plus crosshair of two arms at each of the four intersections', () => {
    const { ctx, ops } = fakeContext();
    drawGlassCopy(ctx, source, 1000, 800);
    const arms = fills(ops).slice(5).map((op) => op.args);
    expect(arms).toHaveLength(8);
    // First intersection (250, 200): horizontal arm then vertical arm, 16 px long.
    expect(arms[0]).toEqual([242, 200, 16, 1]);
    expect(arms[1]).toEqual([250, 192, 1, 16]);
    const centers = [0, 2, 4, 6].map((index) => [(arms[index]![0] as number) + 8, arms[index]![1]]);
    expect(centers).toEqual([
      [250, 200],
      [750, 200],
      [250, 600],
      [750, 600],
    ]);
  });

  it('draws the scene canvas last, scaled to the viewport at pixel ratio 1', () => {
    const { ctx, ops } = fakeContext();
    drawGlassCopy(ctx, source, 1000, 800);
    const draws = ops.filter((op) => op.name === 'drawImage');
    expect(draws).toHaveLength(1);
    expect(draws[0]!.args).toEqual([source, 0, 0, 1000, 800]);
    expect(ops.at(-1)).toBe(draws[0]);
  });

  it('follows another viewport size and uses only palette token colours', () => {
    const { ctx, ops } = fakeContext();
    drawGlassCopy(ctx, source, 390, 844);
    expect(ops[0]!.args).toEqual([0, 0, 390, 844]);
    expect(fills(ops)[1]!.args).toEqual([97, 0, 1, 844]);
    expect(ops.at(-1)!.args).toEqual([source, 0, 0, 390, 844]);
    const palette = new Set<string>(Object.values(COLORS));
    expect(fills(ops).every((op) => palette.has(op.style))).toBe(true);
  });

  describe('with an overscan margin', () => {
    const O = 160;

    it('fills the whole overscanned canvas with the bg token first', () => {
      const { ctx, ops } = fakeContext();
      drawGlassCopy(ctx, source, 1000, 800, O);
      expect(ops[0]).toEqual({ name: 'fillRect', style: COLORS.bg, args: [0, 0, 1320, 1120] });
    });

    it('keeps the grid registered to the viewport and runs the lines through the margin', () => {
      const { ctx, ops } = fakeContext();
      drawGlassCopy(ctx, source, 1000, 800, O);
      expect(fills(ops).slice(1, 5).map((op) => op.args)).toEqual([
        [410, 0, 1, 1120],
        [910, 0, 1, 1120],
        [0, 360, 1320, 1],
        [0, 760, 1320, 1],
      ]);
      const arms = fills(ops).slice(5).map((op) => op.args);
      expect(arms[0]).toEqual([402, 360, 16, 1]);
      expect(arms[1]).toEqual([410, 352, 1, 16]);
    });

    it('draws the scene canvas at the margin offset, 1:1 with the viewport', () => {
      const { ctx, ops } = fakeContext();
      drawGlassCopy(ctx, source, 390, 844, O);
      expect(ops.at(-1)!.args).toEqual([source, 160, 160, 390, 844]);
    });
  });
});
