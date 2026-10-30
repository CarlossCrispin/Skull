import { describe, expect, it } from 'vitest';
import {
  opIntersect,
  opSmoothUnion,
  opSubtract,
  opUnion,
  sdBox,
  sdCapsule,
  sdEllipsoid,
  sdRoundBox,
  sdSphere,
  sdTriPrism,
} from './sdf.ts';

describe('primitives', () => {
  it('sdSphere: inside, surface and outside', () => {
    expect(sdSphere(0, 0, 0, 5)).toBe(-5);
    expect(sdSphere(5, 0, 0, 5)).toBe(0);
    expect(sdSphere(3, 4, 0, 5)).toBeCloseTo(0, 12);
    expect(sdSphere(0, 8, 0, 5)).toBe(3);
  });

  it('sdEllipsoid: surface on each axis, outside distance along an axis, inside negative', () => {
    expect(sdEllipsoid(10, 0, 0, 10, 6, 4)).toBeCloseTo(0, 12);
    expect(sdEllipsoid(0, 6, 0, 10, 6, 4)).toBeCloseTo(0, 12);
    expect(sdEllipsoid(0, 0, 4, 10, 6, 4)).toBeCloseTo(0, 12);
    expect(sdEllipsoid(20, 0, 0, 10, 6, 4)).toBeCloseTo(10, 9);
    expect(sdEllipsoid(1, 1, 1, 10, 6, 4)).toBeLessThan(0);
    expect(sdEllipsoid(0, 0, 0, 10, 6, 4)).toBeLessThan(0);
  });

  it('sdBox: inside, face, edge and corner distances', () => {
    expect(sdBox(0, 0, 0, 2, 3, 4)).toBe(-2);
    expect(sdBox(2, 0, 0, 2, 3, 4)).toBe(0);
    expect(sdBox(5, 0, 0, 2, 3, 4)).toBe(3);
    expect(sdBox(5, 7, 0, 2, 3, 4)).toBe(5);
    expect(sdBox(3, 4, 5, 2, 3, 4)).toBeCloseTo(Math.sqrt(3), 12);
  });

  it('sdRoundBox: keeps outer extents, rounds the corner', () => {
    expect(sdRoundBox(0, 0, 0, 5, 5, 5, 1)).toBe(-5);
    expect(sdRoundBox(5, 0, 0, 5, 5, 5, 1)).toBe(0);
    expect(sdRoundBox(5, 5, 5, 5, 5, 5, 1)).toBeCloseTo(Math.sqrt(3) - 1, 12);
  });

  it('sdCapsule: along the axis, past the end cap and radially', () => {
    // segment (0,0,0)-(10,0,0), radius 2
    expect(sdCapsule(5, 0, 0, 0, 0, 0, 10, 0, 0, 2)).toBe(-2);
    expect(sdCapsule(5, 2, 0, 0, 0, 0, 10, 0, 0, 2)).toBe(0);
    expect(sdCapsule(15, 0, 0, 0, 0, 0, 10, 0, 0, 2)).toBe(3);
    expect(sdCapsule(-3, 4, 0, 0, 0, 0, 10, 0, 0, 2)).toBeCloseTo(3, 12);
  });

  it('sdTriPrism: apex up, extruded along z; infinite depth keeps the 2D distance', () => {
    const f = (x: number, y: number, z = 0) => sdTriPrism(x, y, z, 4, 6, Infinity);
    expect(f(0, 0)).toBeLessThan(0);
    expect(f(3, -5)).toBeLessThan(0); // near base corner: inside
    expect(f(3, 5)).toBeGreaterThan(0); // near apex, wide side: outside
    expect(f(0, -6)).toBeCloseTo(0, 12);
    expect(f(0, -7)).toBeCloseTo(1, 12);
    expect(f(0, 7)).toBeCloseTo(1, 12);
    expect(f(0, 0, 500)).toBe(f(0, 0, -500));
    expect(f(0, 0, 500)).toBeLessThan(0);
    // finite depth is bounded
    expect(sdTriPrism(0, 0, 10, 4, 6, 3)).toBe(7);
  });
});

describe('operators', () => {
  it('union is min, intersect is max, subtract carves', () => {
    expect(opUnion(2, -1)).toBe(-1);
    expect(opIntersect(2, -1)).toBe(2);
    expect(opSubtract(-3, -1)).toBe(1); // inside a, inside b => removed
    expect(opSubtract(-3, 4)).toBe(-3); // inside a, outside b => kept
  });

  it('smooth union never exceeds the hard union and equals it when far apart', () => {
    expect(opSmoothUnion(1, 1, 2)).toBeCloseTo(0.5, 12);
    expect(opSmoothUnion(1, 1, 2)).toBeLessThan(opUnion(1, 1));
    expect(opSmoothUnion(0, 10, 2)).toBe(0);
    expect(opSmoothUnion(3, -4, 2)).toBe(-4);
  });
});
