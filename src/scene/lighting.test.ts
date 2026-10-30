import { AmbientLight, DirectionalLight, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import {
  AMBIENT_INTENSITY,
  DIRECTIONAL_INTENSITY,
  LIGHT_DIRECTION,
  createLightRig,
} from './lighting.ts';

describe('light constants', () => {
  it('exports the normalized (-1, 0.55, 0.45) direction', () => {
    const len = Math.hypot(-1, 0.55, 0.45);
    expect(LIGHT_DIRECTION[0]).toBeCloseTo(-1 / len, 9);
    expect(LIGHT_DIRECTION[1]).toBeCloseTo(0.55 / len, 9);
    expect(LIGHT_DIRECTION[2]).toBeCloseTo(0.45 / len, 9);
    expect(Math.hypot(...LIGHT_DIRECTION)).toBeCloseTo(1, 9);
  });

  it('has a dominant directional light over a low ambient', () => {
    expect(DIRECTIONAL_INTENSITY).toBeGreaterThan(0);
    expect(AMBIENT_INTENSITY).toBeGreaterThan(0);
    expect(AMBIENT_INTENSITY).toBeLessThan(DIRECTIONAL_INTENSITY);
  });
});

describe('createLightRig', () => {
  it('creates exactly one DirectionalLight and one AmbientLight', () => {
    const rig = createLightRig();
    const lights = rig.children;
    expect(lights).toHaveLength(2);
    expect(lights.filter((l) => l instanceof DirectionalLight)).toHaveLength(1);
    expect(lights.filter((l) => l instanceof AmbientLight)).toHaveLength(1);
  });

  it('positions the directional light along the exported direction with exported intensities', () => {
    const rig = createLightRig();
    const dir = rig.children.find((l): l is DirectionalLight => l instanceof DirectionalLight)!;
    const amb = rig.children.find((l): l is AmbientLight => l instanceof AmbientLight)!;
    const unit = dir.position.clone().normalize();
    expect(unit.distanceTo(new Vector3(...LIGHT_DIRECTION))).toBeLessThan(1e-9);
    expect(dir.intensity).toBe(DIRECTIONAL_INTENSITY);
    expect(amb.intensity).toBe(AMBIENT_INTENSITY);
  });

  it('casts no shadows', () => {
    for (const light of createLightRig().children) {
      expect(light.castShadow).toBe(false);
    }
  });

  it('returns an independent rig per call', () => {
    expect(createLightRig()).not.toBe(createLightRig());
  });
});
