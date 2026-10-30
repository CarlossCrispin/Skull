import {
  MeshLambertMaterial,
  ShaderLib,
  Vector2,
  Vector3,
  type DataTexture,
  type WebGLProgramParametersWithUniforms,
} from 'three';
import { ASSEMBLY_STAGGER } from '../../lib/motion/constants.ts';
import { COLORS } from '../../styles/tokens.ts';
import { SCATTER_MUTE_DESATURATE, SCATTER_MUTE_LIGHTEN } from '../constants.ts';
import { CAMERA_DISTANCE } from '../framing.ts';
import { ATLAS_TILES } from './atlas.ts';

export interface ShaderSources {
  vertexShader: string;
  fragmentShader: string;
}

export interface PatchableShader extends ShaderSources {
  uniforms: Record<string, { value: unknown }>;
}

/**
 * Uniform block shared with the compiled program: the patch assigns these exact
 * objects into `shader.uniforms`, so writing `.value` here is what three uploads.
 */
export interface VoxelUniforms {
  /** Global assembly progress: 0 scattered, 1 assembled. */
  readonly uProgress: { value: number };
  readonly uStagger: { value: number };
  /** Half width and half height of the view at the origin plane (world units). */
  readonly uScatterScale: { value: Vector2 };
  /** (desaturate, lighten) amounts of the scatter mute, applied per cube as `1 - e`. */
  readonly uMute: { value: Vector2 };
  /** Page background as sRGB bytes / 255 (mixed after the output transform). */
  readonly uMuteColor: { value: Vector3 };
}

export type MaterialPatcher = (material: MeshLambertMaterial, atlas: DataTexture, uniforms: VoxelUniforms) => boolean;

const BG_HEX = COLORS.bg;

/** Assembled, unmuted defaults: the page looks identical until a driver writes the uniforms. */
export function createVoxelUniforms(): VoxelUniforms {
  const byte = (offset: number): number => Number.parseInt(BG_HEX.slice(offset, offset + 2), 16) / 255;
  return {
    uProgress: { value: 1 },
    uStagger: { value: ASSEMBLY_STAGGER },
    uScatterScale: { value: new Vector2(1, 1) },
    uMute: { value: new Vector2(SCATTER_MUTE_DESATURATE, SCATTER_MUTE_LIGHTEN) },
    uMuteColor: { value: new Vector3(byte(1), byte(3), byte(5)) },
  };
}

/** Chunks the patch splices around; each must exist in the installed Lambert shader. */
export const PATCH_ANCHORS = [
  { stage: 'vertex', token: '#include <common>' },
  { stage: 'vertex', token: '#include <uv_vertex>' },
  { stage: 'vertex', token: '#include <project_vertex>' },
  { stage: 'fragment', token: '#include <common>' },
  { stage: 'fragment', token: '#include <color_fragment>' },
  { stage: 'fragment', token: '#include <colorspace_fragment>' },
  { stage: 'fragment', token: '#include <dithering_fragment>' },
] as const;

const VERTEX_DECLARATIONS = `
attribute float aTile;
attribute float aFlat;
attribute vec3 aScatter;
attribute float aDelay;
uniform float uProgress;
uniform float uStagger;
uniform vec2 uScatterScale;
varying vec2 vVoxUv;
varying float vTile;
varying float vFlat;
varying float vVoxMute;
const float VOX_CAMERA_DISTANCE = ${CAMERA_DISTANCE}.0;
`;

const VERTEX_ASSIGNMENTS = `
	vVoxUv = uv;
	vTile = aTile;
	vFlat = aFlat;
`;

// Scroll-scrubbed assembly (view space, after project_vertex; three assigns
// vViewPosition from the moved mvPosition afterwards). At uProgress = 1 every
// cube has voxE = 1 exactly, so the displacement is zero and the pose is unchanged.
// The explicit uProgress >= 1 branch avoids float rounding in the delay = 1 window.
const VERTEX_DISPLACEMENT = `
#ifdef USE_INSTANCING
	float voxT = uProgress >= 1.0 ? 1.0 : clamp( ( uProgress - aDelay * uStagger ) / ( 1.0 - uStagger ), 0.0, 1.0 );
	float voxF = 2.0 - 2.0 * voxT;
	float voxE = voxT < 0.5 ? 4.0 * voxT * voxT * voxT : 1.0 - 0.5 * voxF * voxF * voxF;
	float voxDepth = VOX_CAMERA_DISTANCE - aScatter.z;
	float voxPersp = voxDepth / VOX_CAMERA_DISTANCE;
	vec3 voxScatter = vec3( aScatter.x * uScatterScale.x * voxPersp, aScatter.y * uScatterScale.y * voxPersp, - voxDepth );
	vec3 voxCenter = ( modelViewMatrix * instanceMatrix * vec4( 0.0, 0.0, 0.0, 1.0 ) ).xyz;
	vec3 voxMove = ( voxScatter - voxCenter ) * ( 1.0 - voxE );
	mvPosition.xyz += voxMove;
	gl_Position = projectionMatrix * mvPosition;
	vVoxMute = 1.0 - voxE;
#else
	vVoxMute = 0.0;
#endif
`;

const FRAGMENT_DECLARATIONS = `
uniform sampler2D uVoxAtlas;
uniform vec2 uMute;
uniform vec3 uMuteColor;
varying float vVoxMute;
varying vec2 vVoxUv;
varying float vTile;
varying float vFlat;
`;

// Lit voxels modulate their tone by the nearest-filtered atlas tile.
const FRAGMENT_ATLAS = `
	if ( vFlat < 0.5 ) {
		vec2 voxUv = clamp( vVoxUv, 0.001, 0.999 );
		diffuseColor.rgb *= texture2D( uVoxAtlas, vec2( ( vTile + voxUv.x ) / ${ATLAS_TILES}.0, voxUv.y ) ).rgb;
	}
`;

// Accents bypass lighting: the (linear) instance color goes through the output
// transform only, so the exact sRGB hex reaches the framebuffer.
// three declares vColor as vec4 even without alpha, so only its rgb is used.
const FRAGMENT_UNLIT = `
	if ( vFlat > 0.5 ) {
		gl_FragColor.rgb = linearToOutputTexel( vec4( vColor.rgb, 1.0 ) ).rgb;
	}
`;

// Scattered cubes mute per cube: desaturate toward the luma, mix toward the page background,
// then blend by `vVoxMute = 1 - e` in output colour space (the same space as the unlit branch),
// so the mesh stays opaque and 1 draw call. At vVoxMute = 0 the colour is exactly unchanged.
const FRAGMENT_MUTE = `
	float voxLuma = dot( gl_FragColor.rgb, vec3( 0.2126, 0.7152, 0.0722 ) );
	vec3 voxMuted = mix( mix( gl_FragColor.rgb, vec3( voxLuma ), uMute.x ), uMuteColor, uMute.y );
	gl_FragColor.rgb = mix( gl_FragColor.rgb, voxMuted, vVoxMute );
`;

function sourceOf(sources: ShaderSources, stage: 'vertex' | 'fragment'): string {
  return stage === 'vertex' ? sources.vertexShader : sources.fragmentShader;
}

export function hasPatchAnchors(sources: ShaderSources): boolean {
  return PATCH_ANCHORS.every(({ stage, token }) => sourceOf(sources, stage).includes(token));
}

/**
 * Splices the per-instance atlas sampling, the scatter displacement, the unlit
 * accent branch and the scatter mute into a Lambert shader. Returns false and leaves `shader` untouched if any anchor is missing.
 */
export function applyVoxelPatch(shader: PatchableShader, atlas: DataTexture, uniforms: VoxelUniforms): boolean {
  if (!hasPatchAnchors(shader)) {
    return false;
  }
  shader.vertexShader = shader.vertexShader
    .replace('#include <common>', `#include <common>${VERTEX_DECLARATIONS}`)
    .replace('#include <uv_vertex>', `#include <uv_vertex>${VERTEX_ASSIGNMENTS}`)
    .replace('#include <project_vertex>', `#include <project_vertex>${VERTEX_DISPLACEMENT}`);
  shader.fragmentShader = shader.fragmentShader
    .replace('#include <common>', `#include <common>${FRAGMENT_DECLARATIONS}`)
    .replace('#include <color_fragment>', `#include <color_fragment>${FRAGMENT_ATLAS}`)
    .replace('#include <dithering_fragment>', `${FRAGMENT_UNLIT}${FRAGMENT_MUTE}\n#include <dithering_fragment>`);
  shader.uniforms.uVoxAtlas = { value: atlas };
  Object.assign(shader.uniforms, uniforms);
  return true;
}

/**
 * Installs the patch on the material. Returns false (material untouched) when
 * the shader source lacks an anchor, so callers can report a patch failure.
 */
export function patchVoxelMaterial(
  material: MeshLambertMaterial,
  atlas: DataTexture,
  uniforms: VoxelUniforms,
  source: ShaderSources = ShaderLib.lambert,
): boolean {
  if (!hasPatchAnchors(source)) {
    return false;
  }
  material.onBeforeCompile = (shader: WebGLProgramParametersWithUniforms): void => {
    applyVoxelPatch(shader, atlas, uniforms);
  };
  material.customProgramCacheKey = (): string => 'voxel-skull-v4';
  return true;
}

/** Matte Lambert material for the instanced skull; the voxel patch is applied when possible. */
export function createVoxelMaterial(
  atlas: DataTexture,
  uniforms: VoxelUniforms,
  patcher: MaterialPatcher = patchVoxelMaterial,
): MeshLambertMaterial {
  const material = new MeshLambertMaterial({ color: 0xffffff });
  patcher(material, atlas, uniforms);
  return material;
}
