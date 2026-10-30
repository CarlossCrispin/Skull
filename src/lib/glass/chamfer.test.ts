import { describe, expect, it } from 'vitest';
import { chamferBracketPoints, chamferFramePoints, glassClipPolygon } from './chamfer.ts';

describe('chamferFramePoints', () => {
  it('traces the card with the top-left and bottom-right corners cut, inset by half the stroke', () => {
    expect(chamferFramePoints(720, 400, 20, 0.5)).toBe('0.5,20.5 20.5,0.5 719.5,0.5 719.5,379.5 699.5,399.5 0.5,399.5');
  });

  it('follows the box it is given', () => {
    expect(chamferFramePoints(200, 100, 20, 0.5)).toBe('0.5,20.5 20.5,0.5 199.5,0.5 199.5,79.5 179.5,99.5 0.5,99.5');
    expect(chamferFramePoints(200, 100, 10, 0)).toBe('0,10 10,0 200,0 200,90 190,100 0,100');
  });

  it('never cuts deeper than half of the shorter side', () => {
    expect(chamferFramePoints(30, 100, 20, 0)).toBe('0,15 15,0 30,0 30,85 15,100 0,100');
  });
});

describe('glassClipPolygon', () => {
  const base = { width: 720, windowTop: 100, windowHeight: 500, cardTop: 100, cardHeight: 500 };

  it('cuts both chamfers when the whole card sits in the window', () => {
    expect(glassClipPolygon(base, 20)).toBe('polygon(0px 20px, 20px 0px, 720px 0px, 720px 480px, 700px 500px, 0px 500px)');
  });

  it('is a plain rectangle in the middle of a tall card, so scrolling there changes nothing', () => {
    const middle = { width: 720, windowTop: -160, windowHeight: 1120, cardTop: -1000, cardHeight: 3000 };
    const shifted = { ...middle, cardTop: -1400 };
    expect(glassClipPolygon(middle, 20)).toBe('polygon(0px 0px, 720px 0px, 720px 1120px, 0px 1120px)');
    expect(glassClipPolygon(shifted, 20)).toBe(glassClipPolygon(middle, 20));
  });

  it('keeps only the top chamfer when the card runs past the window bottom', () => {
    const top = { width: 720, windowTop: 100, windowHeight: 860, cardTop: 100, cardHeight: 3000 };
    expect(glassClipPolygon(top, 20)).toBe('polygon(0px 20px, 20px 0px, 720px 0px, 720px 860px, 0px 860px)');
  });

  it('keeps only the bottom chamfer when the card starts above the window', () => {
    const bottom = { width: 720, windowTop: -160, windowHeight: 260, cardTop: -2900, cardHeight: 3000 };
    expect(glassClipPolygon(bottom, 20)).toBe('polygon(0px 0px, 720px 0px, 720px 240px, 700px 260px, 0px 260px)');
  });

  it('follows a chamfer that is only partly inside the window', () => {
    const partial = { width: 720, windowTop: -160, windowHeight: 400, cardTop: -170, cardHeight: 3000 };
    expect(glassClipPolygon(partial, 20)).toBe('polygon(0px 10px, 20px -10px, 720px -10px, 720px 400px, 0px 400px)');
  });
});

describe('chamferBracketPoints', () => {
  it('marks the top-right and bottom-left corners with L-shaped brackets inside the box', () => {
    expect(chamferBracketPoints(720, 400, 14, 6)).toEqual(['700,6 714,6 714,20', '6,380 6,394 20,394']);
  });

  it('follows the box, arm and inset it is given', () => {
    expect(chamferBracketPoints(200, 100, 10, 4)).toEqual(['186,4 196,4 196,14', '4,86 4,96 14,96']);
  });
});
