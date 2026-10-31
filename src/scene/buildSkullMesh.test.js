import { BoxGeometry, Color, InstancedBufferAttribute, InstancedMesh, LineSegments, Matrix4, StaticDrawUsage, Vector3 } from 'three';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { buildSkull, buildSkullMesh } from './buildSkullMesh.js';
import { createAtlas } from './material/atlas.js';
import { createVoxelMaterial, createVoxelUniforms } from './material/voxelMaterial.js';
import { generateScatter } from './scatter/generateScatter.js';
import { generateSkull } from './voxel/generate.js';

let model;

beforeAll(() => {
  model = generateSkull();
});

function mesh() {
  return buildSkullMesh(model, createVoxelMaterial(createAtlas(), createVoxelUniforms()));
}

describe('buildSkullMesh', () => {
  it('creates one instance per model voxel on a shared 0.9 box', () => {
    const m = mesh();
    expect(m).toBeInstanceOf(InstancedMesh);
    expect(m.count).toBe(model.count);
    expect(model.count).toBeGreaterThan(5000);
    expect(m.geometry).toBeInstanceOf(BoxGeometry);
    const { width, height, depth } = m.geometry.parameters;
    expect([width, height, depth]).toEqual([0.9, 0.9, 0.9]);
  });

  it('writes instance matrices at centered grid coordinates (y up, +z toward viewer)', () => {
    const m = mesh();
    const { w, h, d } = model.size;
    const matrix = new Matrix4();
    const p = new Vector3();
    for (const i of [0, Math.floor(model.count / 2), model.count - 1]) {
      m.getMatrixAt(i, matrix);
      p.setFromMatrixPosition(matrix);
      expect(p.x).toBeCloseTo(model.positions[3 * i] - (w - 1) / 2, 9);
      expect(p.y).toBeCloseTo(model.positions[3 * i + 1] - (h - 1) / 2, 9);
      expect(p.z).toBeCloseTo(model.positions[3 * i + 2] - (d - 1) / 2, 9);
    }
    expect(m.instanceMatrix.usage).toBe(35044); // StaticDrawUsage
  });

  it('writes instanceColor from model.color (sRGB bytes -> linear working space)', () => {
    const m = mesh();
    expect(m.instanceColor).not.toBeNull();
    const color = new Color();
    for (const i of [0, 17, model.count - 1]) {
      m.getColorAt(i, color);
      const expected = new Color().setRGB(
        model.color[3 * i] / 255,
        model.color[3 * i + 1] / 255,
        model.color[3 * i + 2] / 255,
        'srgb',
      );
      expect(color.r).toBeCloseTo(expected.r, 6);
      expect(color.g).toBeCloseTo(expected.g, 6);
      expect(color.b).toBeCloseTo(expected.b, 6);
    }
  });

  it('keeps the exact accent hexes after the sRGB round trip', () => {
    const m = mesh();
    const hexes = new Set();
    const color = new Color();
    for (let i = 0; i < model.count; i++) {
      if (model.flat[i] === 1) {
        m.getColorAt(i, color);
        hexes.add(color.getHexString('srgb').toUpperCase());
      }
    }
    expect([...hexes].sort()).toEqual(['8E4AF2', 'E2680A']);
  });

  it('exposes aTile and aFlat as per-instance attributes copied from the model', () => {
    const m = mesh();
    const tile = m.geometry.getAttribute('aTile');
    const flat = m.geometry.getAttribute('aFlat');
    expect(tile.count).toBe(model.count);
    expect(flat.count).toBe(model.count);
    expect(tile.itemSize).toBe(1);
    expect(tile.isInstancedBufferAttribute).toBe(true);
    let flatTotal = 0;
    for (let i = 0; i < model.count; i++) {
      expect(tile.getX(i)).toBe(model.tile[i]);
      expect(flat.getX(i)).toBe(model.flat[i]);
      flatTotal += flat.getX(i);
    }
    expect(flatTotal).toBeGreaterThan(0);
    expect(flatTotal).toBeLessThan(10);
  });
});

describe('buildSkullMesh scatter attributes', () => {
  it('adds aScatter (itemSize 3) and aDelay (itemSize 1) as instanced attributes sized to the model', () => {
    const m = mesh();
    const scatter = m.geometry.getAttribute('aScatter');
    const delay = m.geometry.getAttribute('aDelay');
    expect(scatter.itemSize).toBe(3);
    expect(delay.itemSize).toBe(1);
    expect(scatter.count).toBe(model.count);
    expect(delay.count).toBe(model.count);
    expect(scatter).toBeInstanceOf(InstancedBufferAttribute);
    expect(delay).toBeInstanceOf(InstancedBufferAttribute);
  });

  it('copies the seeded generateScatter output and is deterministic across builds', () => {
    const expected = generateScatter(model.count);
    const a = mesh().geometry.getAttribute('aScatter');
    const b = mesh().geometry.getAttribute('aScatter');
    const delay = mesh().geometry.getAttribute('aDelay');
    for (const i of [0, 123, model.count - 1]) {
      expect(a.getX(i)).toBe(expected.scatter[3 * i]);
      expect(a.getZ(i)).toBe(expected.scatter[3 * i + 2]);
      expect(b.getY(i)).toBe(a.getY(i));
      expect(delay.getX(i)).toBe(expected.delay[i]);
    }
    expect(Math.max(...expected.delay)).toBeGreaterThan(0.9);
  });

  it('disables frustum culling and keeps the instance matrix static', () => {
    const m = mesh();
    expect(m.frustumCulled).toBe(false);
    expect(m.instanceMatrix.usage).toBe(StaticDrawUsage);
  });
});

describe('buildSkull drawables', () => {
  it('has 1 draw call without lattice', () => {
    const skull = buildSkull(model, { lattice: false });
    expect(skull.lattice).toBeNull();
    expect(skull.drawCount).toBe(1);
  });

  it('has 2 draw calls with lattice, the second being a LineSegments', () => {
    const skull = buildSkull(model, { lattice: true });
    expect(skull.lattice).toBeInstanceOf(LineSegments);
    expect(skull.drawCount).toBe(2);
  });

  it('defaults the lattice to LATTICE_ENABLED (on)', () => {
    expect(buildSkull(model).drawCount).toBe(2);
  });

  it('disposes geometry, material, atlas and lattice resources once', () => {
    const skull = buildSkull(model, { lattice: true });
    const events = [];
    skull.mesh.geometry.addEventListener('dispose', () => events.push('geometry'));
    skull.mesh.material.addEventListener('dispose', () =>
      events.push('material'),
    );
    skull.atlas.addEventListener('dispose', () => events.push('atlas'));
    skull.lattice.geometry.addEventListener('dispose', () => events.push('lattice'));
    skull.dispose();
    expect(events.sort()).toEqual(['atlas', 'geometry', 'lattice', 'material']);
  });
});

describe('buildSkull patcher option', () => {
  it('passes the injected patcher the material, atlas and the exposed uniforms', () => {
    const patcher = vi.fn((_material, _atlas, _uniforms) => false);
    const objects = buildSkull(model, { patcher });
    expect(patcher).toHaveBeenCalledTimes(1);
    expect(patcher.mock.calls[0][1]).toBe(objects.atlas);
    expect(patcher.mock.calls[0][2]).toBe(objects.uniforms);
    objects.dispose();
  });

  it('reports patched true for the real patch and false when the patcher declines', () => {
    const real = buildSkull(model);
    expect(real.patched).toBe(true);
    const declined = buildSkull(model, { patcher: () => false });
    expect(declined.patched).toBe(false);
    real.dispose();
    declined.dispose();
  });

  it('exposes assembled, unmuted default uniforms', () => {
    const objects = buildSkull(model);
    expect(objects.uniforms.uProgress.value).toBe(1);
    expect(objects.uniforms.uMute.value.x).toBe(0.7);
    objects.dispose();
  });
});
