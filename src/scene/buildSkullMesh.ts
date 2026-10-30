import {
  BoxGeometry,
  Color,
  InstancedBufferAttribute,
  InstancedMesh,
  Matrix4,
  SRGBColorSpace,
  StaticDrawUsage,
  type DataTexture,
  type LineSegments,
  type MeshLambertMaterial,
} from 'three';
import { LATTICE_ENABLED } from './constants.ts';
import { createLattice } from './lattice.ts';
import { createAtlas } from './material/atlas.ts';
import {
  createVoxelMaterial,
  createVoxelUniforms,
  patchVoxelMaterial,
  type MaterialPatcher,
  type VoxelUniforms,
} from './material/voxelMaterial.ts';
import { generateScatter } from './scatter/generateScatter.ts';
import type { VoxelModel } from './voxel/model.ts';

/** Cube edge in grid units; the 0.1 gap keeps voxel edges readable. */
export const VOXEL_EDGE = 0.9;

/**
 * Maps a voxel model to one InstancedMesh. Instances sit at centered grid
 * coordinates (y up, +z toward the viewer); matrices, colors and the seeded
 * scatter attributes are written once.
 */
export function buildSkullMesh(model: VoxelModel, material: MeshLambertMaterial): InstancedMesh {
  const geometry = new BoxGeometry(VOXEL_EDGE, VOXEL_EDGE, VOXEL_EDGE);
  const mesh = new InstancedMesh(geometry, material, model.count);
  mesh.instanceMatrix.setUsage(StaticDrawUsage);
  // The instanced bounding sphere only covers the assembled model; scattered cubes lie outside it.
  mesh.frustumCulled = false;

  const { w, h, d } = model.size;
  const matrix = new Matrix4();
  const color = new Color();
  for (let i = 0; i < model.count; i++) {
    matrix.makeTranslation(
      model.positions[3 * i]! - (w - 1) / 2,
      model.positions[3 * i + 1]! - (h - 1) / 2,
      model.positions[3 * i + 2]! - (d - 1) / 2,
    );
    mesh.setMatrixAt(i, matrix);
    color.setRGB(model.color[3 * i]! / 255, model.color[3 * i + 1]! / 255, model.color[3 * i + 2]! / 255, SRGBColorSpace);
    mesh.setColorAt(i, color);
  }

  geometry.setAttribute('aTile', new InstancedBufferAttribute(Float32Array.from(model.tile), 1));
  geometry.setAttribute('aFlat', new InstancedBufferAttribute(Float32Array.from(model.flat), 1));

  const { scatter, delay } = generateScatter(model.count);
  geometry.setAttribute('aScatter', new InstancedBufferAttribute(scatter, 3));
  geometry.setAttribute('aDelay', new InstancedBufferAttribute(delay, 1));
  return mesh;
}

export interface SkullBuildOptions {
  /** Defaults to `LATTICE_ENABLED`. */
  readonly lattice?: boolean;
  /** Shader patch installer; defaults to the pinned voxel patch. A `false` result is reported as `patched: false`. */
  readonly patcher?: MaterialPatcher;
}

export interface SkullObjects {
  readonly mesh: InstancedMesh;
  /** Static cage (does not rotate with the skull); `null` when disabled. */
  readonly lattice: LineSegments | null;
  readonly atlas: DataTexture;
  /** Uniform objects the compiled program shares; write `.value` to drive the shader. */
  readonly uniforms: VoxelUniforms;
  /** False when the shader patch declined (an anchor is missing): the scene must not render. */
  readonly patched: boolean;
  /** Number of draw calls the objects issue: 1 skull, +1 with lattice. */
  readonly drawCount: number;
  dispose(): void;
}

export function buildSkull(model: VoxelModel, options: SkullBuildOptions = {}): SkullObjects {
  const atlas = createAtlas();
  const uniforms = createVoxelUniforms();
  const patcher = options.patcher ?? patchVoxelMaterial;
  let patched = false;
  const material = createVoxelMaterial(atlas, uniforms, (target, texture, shared) => {
    patched = patcher(target, texture, shared);
    return patched;
  });
  const mesh = buildSkullMesh(model, material);
  const lattice = createLattice(model.size, options.lattice ?? LATTICE_ENABLED);
  return {
    mesh,
    lattice,
    atlas,
    uniforms,
    patched,
    drawCount: lattice === null ? 1 : 2,
    dispose(): void {
      mesh.geometry.dispose();
      material.dispose();
      atlas.dispose();
      if (lattice !== null) {
        lattice.geometry.dispose();
        (lattice.material as { dispose(): void }).dispose();
      }
      mesh.dispose();
    },
  };
}
