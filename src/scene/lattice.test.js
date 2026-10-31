import { LineBasicMaterial, LineSegments } from 'three';
import { describe, expect, it } from 'vitest';
import { LATTICE_SCALE, LATTICE_SUBDIVISIONS, createLattice, latticeVertices } from './lattice.js';

const BOUNDS = { w: 48, h: 56, d: 44 };

describe('createLattice', () => {
  it('returns one LineSegments with a gray-400 LineBasicMaterial', () => {
    const lattice = createLattice(BOUNDS, true);
    expect(lattice).toBeInstanceOf(LineSegments);
    const material = lattice.material;
    expect(material).toBeInstanceOf(LineBasicMaterial);
    expect(material.color.getHexString()).toBe('888888');
  });

  it('draws 4 subdivisions per face: (4 + 1) lines per direction on 6 faces', () => {
    expect(LATTICE_SUBDIVISIONS).toBe(4);
    const lattice = createLattice(BOUNDS, true);
    const position = lattice.geometry.getAttribute('position');
    const segments = position.count / 2;
    expect(segments).toBe(6 * 2 * (LATTICE_SUBDIVISIONS + 1));
  });

  it('spans the bounds scaled by 1.25 on every axis', () => {
    expect(LATTICE_SCALE).toBe(1.25);
    const lattice = createLattice(BOUNDS, true);
    lattice.geometry.computeBoundingBox();
    const box = lattice.geometry.boundingBox;
    expect(box.max.x - box.min.x).toBeCloseTo(48 * 1.25, 9);
    expect(box.max.y - box.min.y).toBeCloseTo(56 * 1.25, 9);
    expect(box.max.z - box.min.z).toBeCloseTo(44 * 1.25, 9);
    expect(box.min.x + box.max.x).toBeCloseTo(0, 9);
  });

  it('places interior lines on the subdivision grid of each face', () => {
    const lattice = createLattice({ w: 8, h: 8, d: 8 }, true);
    const position = lattice.geometry.getAttribute('position');
    const xs = new Set();
    for (let i = 0; i < position.count; i++) {
      xs.add(Number(position.getX(i).toFixed(6)));
    }
    // Cage half-extent 5 (8 * 1.25 / 2); x stops at -5, -2.5, 0, 2.5, 5.
    expect([...xs].sort((a, b) => a - b)).toEqual([-5, -2.5, 0, 2.5, 5]);
  });

  it('uses a transparent material whose opacity is settable and starts fully opaque', () => {
    const lattice = createLattice(BOUNDS, true);
    const material = lattice.material;
    expect(material.transparent).toBe(true);
    expect(material.opacity).toBe(1);
    material.opacity = 0.4;
    expect(material.opacity).toBe(0.4);
    expect(material.color.getHexString()).toBe('888888');
  });

  it('can be hidden without being rebuilt', () => {
    const lattice = createLattice(BOUNDS, true);
    expect(lattice.visible).toBe(true);
    lattice.visible = false;
    expect(lattice.visible).toBe(false);
  });

  it('is absent when the flag is off', () => {
    expect(createLattice(BOUNDS, false)).toBeNull();
  });

  it('defaults to the LATTICE_ENABLED flag (on)', () => {
    expect(createLattice(BOUNDS)).toBeInstanceOf(LineSegments);
  });
});

describe('latticeVertices', () => {
  it('returns the exact vertex data the LineSegments geometry is built from', () => {
    const lattice = createLattice(BOUNDS, true);
    const position = lattice.geometry.getAttribute('position');
    const vertices = latticeVertices(BOUNDS);
    expect(vertices).toHaveLength(position.count * 3);
    expect(vertices.length).toBe(6 * 2 * (LATTICE_SUBDIVISIONS + 1) * 2 * 3);
    for (let i = 0; i < position.count; i++) {
      expect(vertices[3 * i]).toBeCloseTo(position.getX(i), 5);
      expect(vertices[3 * i + 1]).toBeCloseTo(position.getY(i), 5);
      expect(vertices[3 * i + 2]).toBeCloseTo(position.getZ(i), 5);
    }
  });

  it('scales with the bounds', () => {
    const small = latticeVertices({ w: 8, h: 8, d: 8 });
    expect(Math.max(...small.map(Math.abs))).toBeCloseTo(5, 9);
    expect(Math.max(...latticeVertices(BOUNDS).map(Math.abs))).toBeCloseTo(35, 9);
  });
});
