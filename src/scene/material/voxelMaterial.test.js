import { Color, MeshLambertMaterial, ShaderChunk, ShaderLib } from 'three';
import { describe, expect, it } from 'vitest';
import { createAtlas } from './atlas.js';
import { assemblyFactor } from '../../lib/motion/assembly.js';
import { mutedColor } from '../scatter/mute.js';
import {
  PATCH_ANCHORS,
  applyVoxelPatch,
  createVoxelMaterial,
  createVoxelUniforms,
  patchVoxelMaterial,
} from './voxelMaterial.js';

function stubFromLambert() {
  return {
    vertexShader: ShaderLib.lambert.vertexShader,
    fragmentShader: ShaderLib.lambert.fragmentShader,
    uniforms: {},
  };
}

describe('installed three ShaderLib.lambert anchors', () => {
  it('contains every anchor the patch relies on', () => {
    expect(PATCH_ANCHORS.length).toBeGreaterThanOrEqual(4);
    expect(ShaderLib.lambert.vertexShader).toContain('#include <uv_vertex>');
    expect(ShaderLib.lambert.fragmentShader).toContain('#include <color_fragment>');
    expect(ShaderLib.lambert.fragmentShader).toContain('#include <dithering_fragment>');
    expect(ShaderLib.lambert.vertexShader).toContain('#include <common>');
    expect(ShaderLib.lambert.fragmentShader).toContain('#include <common>');
    expect(ShaderLib.lambert.vertexShader).toContain('#include <project_vertex>');
    expect(ShaderLib.lambert.fragmentShader).toContain('#include <colorspace_fragment>');
  });

  it('assigns vViewPosition after project_vertex so the displaced position lights the cube', () => {
    const vs = ShaderLib.lambert.vertexShader;
    expect(vs.indexOf('vViewPosition = - mvPosition.xyz;')).toBeGreaterThan(vs.indexOf('#include <project_vertex>'));
    expect(ShaderChunk.project_vertex).toContain('vec4 mvPosition');
    expect(ShaderChunk.project_vertex).toContain('gl_Position = projectionMatrix * mvPosition;');
  });
});

describe('createVoxelUniforms', () => {
  it('defaults to the assembled state with the mute amounts of the scene constants', () => {
    const u = createVoxelUniforms();
    expect(u.uProgress.value).toBe(1);
    expect(u.uStagger.value).toBe(0.6);
    expect(u.uScatterScale.value.x).toBe(1);
    expect([u.uMute.value.x, u.uMute.value.y]).toEqual([0.7, 0.55]);
  });

  it('holds exactly the five v4 uniforms and none of the removed dim or avoid ones', () => {
    const keys = Object.keys(createVoxelUniforms()).sort();
    expect(keys).toEqual(['uMute', 'uMuteColor', 'uProgress', 'uScatterScale', 'uStagger']);
  });

  it('holds the sRGB bytes of #F8F8F8 over 255 as the mute colour (no linearization)', () => {
    const { x, y, z } = createVoxelUniforms().uMuteColor.value;
    expect([x, y, z]).toEqual([248 / 255, 248 / 255, 248 / 255]);
  });

  it('returns independent objects per call', () => {
    const a = createVoxelUniforms();
    const b = createVoxelUniforms();
    a.uProgress.value = 0.25;
    expect(b.uProgress.value).toBe(1);
  });
});

describe('applyVoxelPatch', () => {
  it('declares per-instance attributes and varyings and assigns them after uv_vertex', () => {
    const shader = stubFromLambert();
    expect(applyVoxelPatch(shader, createAtlas(), createVoxelUniforms())).toBe(true);
    expect(shader.vertexShader).toContain('attribute float aTile;');
    expect(shader.vertexShader).toContain('attribute float aFlat;');
    expect(shader.vertexShader).toContain('varying vec2 vVoxUv;');
    const uvAt = shader.vertexShader.indexOf('#include <uv_vertex>');
    const assignAt = shader.vertexShader.indexOf('vFlat = aFlat;');
    expect(assignAt).toBeGreaterThan(uvAt);
    expect(shader.vertexShader).toContain('vTile = aTile;');
    expect(shader.vertexShader).toContain('vVoxUv = uv;');
  });

  it('samples the atlas for lit voxels right after color_fragment', () => {
    const shader = stubFromLambert();
    const atlas = createAtlas();
    applyVoxelPatch(shader, atlas, createVoxelUniforms());
    const colorAt = shader.fragmentShader.indexOf('#include <color_fragment>');
    const sampleAt = shader.fragmentShader.indexOf('texture2D( uVoxAtlas');
    expect(sampleAt).toBeGreaterThan(colorAt);
    expect(shader.fragmentShader).toContain('uniform sampler2D uVoxAtlas;');
    expect(shader.fragmentShader).toContain('vFlat < 0.5');
    expect(shader.uniforms.uVoxAtlas?.value).toBe(atlas);
  });

  it('outputs the unlit instance color for flat voxels before dithering_fragment', () => {
    const shader = stubFromLambert();
    applyVoxelPatch(shader, createAtlas(), createVoxelUniforms());
    const unlitAt = shader.fragmentShader.indexOf('vFlat > 0.5');
    const ditherAt = shader.fragmentShader.indexOf('#include <dithering_fragment>');
    expect(unlitAt).toBeGreaterThan(shader.fragmentShader.indexOf('#include <colorspace_fragment>'));
    expect(unlitAt).toBeLessThan(ditherAt);
    expect(shader.fragmentShader).toMatch(/gl_FragColor\.rgb = linearToOutputTexel\( vec4\( vColor\.rgb, 1\.0 \) \)\.rgb;/);
  });

  it('builds the unlit vec4 from the rgb of the installed vec4 vColor varying', () => {
    expect(ShaderChunk.color_pars_fragment).toContain('varying vec4 vColor;');
    const shader = stubFromLambert();
    applyVoxelPatch(shader, createAtlas(), createVoxelUniforms());
    expect(shader.fragmentShader).not.toMatch(/vec4\( vColor,/);
  });

  it('declares the v4 attributes, uniforms and the mute varying', () => {
    const shader = stubFromLambert();
    expect(applyVoxelPatch(shader, createAtlas(), createVoxelUniforms())).toBe(true);
    for (const decl of [
      'attribute vec3 aScatter;',
      'attribute float aDelay;',
      'uniform float uProgress;',
      'uniform float uStagger;',
      'uniform vec2 uScatterScale;',
      'varying float vVoxMute;',
    ]) {
      expect(shader.vertexShader).toContain(decl);
    }
    expect(shader.fragmentShader).toContain('varying float vVoxMute;');
    expect(shader.fragmentShader).toContain('uniform vec2 uMute;');
    expect(shader.fragmentShader).toContain('uniform vec3 uMuteColor;');
  });

  it('assigns vVoxMute = 1.0 - voxE for instances and 0.0 otherwise', () => {
    const shader = stubFromLambert();
    applyVoxelPatch(shader, createAtlas(), createVoxelUniforms());
    const vs = shader.vertexShader;
    expect(vs).toContain('vVoxMute = 1.0 - voxE;');
    expect(vs.indexOf('vVoxMute = 0.0;')).toBeGreaterThan(vs.indexOf('#else'));
  });

  it('keeps none of the removed dim and avoid-column code in either stage', () => {
    const shader = stubFromLambert();
    applyVoxelPatch(shader, createAtlas(), createVoxelUniforms());
    for (const removed of ['uDimRect', 'uDimRect2', 'uDimFeather', 'voxDimFor', 'voxNdc', 'uAvoidColumn', 'uColumnHalf', 'vVoxDim', 'uDimColor']) {
      expect(shader.vertexShader, removed).not.toContain(removed);
      expect(shader.fragmentShader, removed).not.toContain(removed);
    }
  });

  it('displaces in view space after project_vertex, before the lighting chunks read mvPosition', () => {
    const shader = stubFromLambert();
    applyVoxelPatch(shader, createAtlas(), createVoxelUniforms());
    const vs = shader.vertexShader;
    const projectAt = vs.indexOf('#include <project_vertex>');
    const moveAt = vs.indexOf('mvPosition.xyz += voxMove;');
    expect(moveAt).toBeGreaterThan(projectAt);
    expect(vs.indexOf('gl_Position = projectionMatrix * mvPosition;', moveAt)).toBeGreaterThan(moveAt);
    expect(vs.indexOf('vViewPosition = - mvPosition.xyz;')).toBeGreaterThan(moveAt);
    expect(vs).toContain('1.0 - 0.5 * voxF * voxF * voxF');
  });

  it('applies the mute after the unlit branch and before dithering_fragment with the luma weights', () => {
    const shader = stubFromLambert();
    applyVoxelPatch(shader, createAtlas(), createVoxelUniforms());
    const fs = shader.fragmentShader;
    const lumaAt = fs.indexOf('float voxLuma');
    expect(lumaAt).toBeGreaterThan(fs.indexOf('vFlat > 0.5'));
    expect(lumaAt).toBeLessThan(fs.indexOf('#include <dithering_fragment>'));
    expect(fs).toContain('vec3( 0.2126, 0.7152, 0.0722 )');
    expect(fs).toContain('mix( mix( gl_FragColor.rgb, vec3( voxLuma ), uMute.x ), uMuteColor, uMute.y )');
    expect(fs).toContain('gl_FragColor.rgb = mix( gl_FragColor.rgb, voxMuted, vVoxMute );');
  });

  it('shares the SAME uniform objects with the shader (reference equality)', () => {
    const shader = stubFromLambert();
    const uniforms = createVoxelUniforms();
    applyVoxelPatch(shader, createAtlas(), uniforms);
    for (const key of Object.keys(uniforms)) {
      expect(shader.uniforms[key]).toBe(uniforms[key]);
    }
    expect(Object.keys(uniforms)).toHaveLength(5);
  });

  describe('GLSL expressions match their TypeScript references', () => {
    function evalVertex(lines, names, values) {
      const shader = stubFromLambert();
      applyVoxelPatch(shader, createAtlas(), createVoxelUniforms());
      const body = shader.vertexShader
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => lines.some((prefix) => l.startsWith(prefix)))
        .map((l) => l.replace(/^float /, 'const ').replace(/aScatter\.x/g, 'aScatterX'))
        .join('\n');
      const smoothstep = (a, b, x) => {
        const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
        return t * t * (3 - 2 * t);
      };
      const run = new Function(
        'clamp',
        'smoothstep',
        'abs',
        ...names,
        `${body}\nreturn { ${lines.map((l) => l.replace(/^float /, '').split(' ')[0]).join(', ')} };`,
      );
      return run((x, lo, hi) => Math.min(hi, Math.max(lo, x)), smoothstep, Math.abs, ...values);
    }

    it.each([
      [0, 0],
      [0.3, 0.5],
      [0.55, 1],
      [0.7, 0.2],
      [1, 1],
      [1, 0],
    ])('ease at uProgress %f and aDelay %f equals assemblyFactor', (p, delay) => {
      const out = evalVertex(['float voxT', 'float voxF', 'float voxE'], ['uProgress', 'aDelay', 'uStagger'], [p, delay, 0.6]);
      expect(out.voxE).toBeCloseTo(assemblyFactor(p, delay, 0.6), 12);
    });

    it('is exactly 1 at uProgress = 1 for every delay (zero displacement)', () => {
      for (let i = 0; i <= 100; i += 1) {
        const out = evalVertex(['float voxT', 'float voxF', 'float voxE'], ['uProgress', 'aDelay', 'uStagger'], [1, i / 100, 0.6]);
        expect(out.voxE).toBe(1);
      }
    });

    function evalMute(hex, vMute) {
      const shader = stubFromLambert();
      const uniforms = createVoxelUniforms();
      applyVoxelPatch(shader, createAtlas(), uniforms);
      const body = shader.fragmentShader
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => /^(float voxLuma|vec3 voxMuted|gl_FragColor\.rgb = mix\( gl_FragColor\.rgb, voxMuted)/.test(l))
        .map((l) => l.replace(/^(float|vec3) /, 'const '))
        .join('\n');
      expect(body.split('\n')).toHaveLength(3);
      const vec3 = (x, y, z) => [x, y, z];
      const dot = (a, b) => a.reduce((sum, v, i) => sum + v * (b[i]), 0);
      const mix = (a, b, t) =>
        Array.isArray(a)
          ? a.map((v, i) => v * (1 - t) + (Array.isArray(b) ? (b[i]) : b) * t)
          : a * (1 - t) + (b) * t;
      // GLSL `vec3( scalar )` broadcasts.
      const vec3Fn = (...args) => (args.length === 1 ? vec3(args[0], args[0], args[0]) : vec3(args[0], args[1], args[2]));
      const value = Number.parseInt(hex.slice(1), 16);
      const gl_FragColor = { rgb: [(value >> 16) & 0xff, (value >> 8) & 0xff, value & 0xff].map((b) => b / 255) };
      const { uMute, uMuteColor } = uniforms;
      const run = new Function('gl_FragColor', 'vec3', 'dot', 'mix', 'uMute', 'uMuteColor', 'vVoxMute', body);
      run(gl_FragColor, vec3Fn, dot, mix, uMute.value, [uMuteColor.value.x, uMuteColor.value.y, uMuteColor.value.z], vMute);
      return `#${gl_FragColor.rgb.map((c) => Math.round(c * 255).toString(16).padStart(2, '0')).join('').toUpperCase()}`;
    }

    it.each([
      ['#8E4AF2', 1],
      ['#2B2B2C', 1],
      ['#8E4AF2', 0.37],
      ['#FF8A1F', 0.8],
      ['#F8F8F8', 0.5],
    ])('mute of %s at vVoxMute %f equals mutedColor', (hex, amount) => {
      expect(evalMute(hex, amount)).toBe(mutedColor(hex, amount));
    });

    it('leaves the colour exactly unchanged at vVoxMute = 0 (assembled state)', () => {
      expect(evalMute('#8E4AF2', 0)).toBe('#8E4AF2');
      expect(evalMute('#2B2B2C', 0)).toBe('#2B2B2C');
    });
  });

  it.each(PATCH_ANCHORS.map((a) => [a.stage, a.token]))(
    'returns false and leaves the shader untouched when %s anchor %s is missing',
    (stage, token) => {
      const shader = stubFromLambert();
      const key = stage === 'vertex' ? 'vertexShader' : 'fragmentShader';
      shader[key] = shader[key].replaceAll(token, '');
      const before = { ...shader, uniforms: { ...shader.uniforms } };
      expect(applyVoxelPatch(shader, createAtlas(), createVoxelUniforms())).toBe(false);
      expect(shader).toEqual(before);
    },
  );
});

describe('patchVoxelMaterial', () => {
  it('installs onBeforeCompile and returns true against the installed ShaderLib', () => {
    const material = new MeshLambertMaterial();
    const original = material.onBeforeCompile;
    const uniforms = createVoxelUniforms();
    expect(patchVoxelMaterial(material, createAtlas(), uniforms)).toBe(true);
    expect(material.onBeforeCompile).not.toBe(original);
    const shader = stubFromLambert();
    material.onBeforeCompile(shader, undefined);
    expect(shader.fragmentShader).toContain('uVoxAtlas');
    expect(shader.uniforms.uProgress).toBe(uniforms.uProgress);
    expect(material.customProgramCacheKey()).toBe('voxel-skull-v4');
  });

  it('returns false without mutating the material when a source anchor is missing', () => {
    const material = new MeshLambertMaterial();
    const original = material.onBeforeCompile;
    const source = {
      vertexShader: ShaderLib.lambert.vertexShader,
      fragmentShader: ShaderLib.lambert.fragmentShader.replace('#include <dithering_fragment>', ''),
    };
    expect(patchVoxelMaterial(material, createAtlas(), createVoxelUniforms(), source)).toBe(false);
    expect(material.onBeforeCompile).toBe(original);
  });
});

describe('createVoxelMaterial', () => {
  it('is matte: Lambert, no specular, black emissive, opaque, white base', () => {
    const material = createVoxelMaterial(createAtlas(), createVoxelUniforms());
    expect(material).toBeInstanceOf(MeshLambertMaterial);
    expect('specular' in material).toBe(false);
    expect(material.emissive.equals(new Color(0x000000))).toBe(true);
    expect(material.transparent).toBe(false);
    expect(material.color.equals(new Color(0xffffff))).toBe(true);
    expect(material.flatShading).toBe(false);
  });

  it('applies the patch by default and falls back to a plain material when the patcher fails', () => {
    const patched = createVoxelMaterial(createAtlas(), createVoxelUniforms());
    const plain = new MeshLambertMaterial();
    expect(patched.onBeforeCompile).not.toBe(plain.onBeforeCompile);

    const fallback = createVoxelMaterial(createAtlas(), createVoxelUniforms(), () => false);
    expect(fallback.onBeforeCompile).toBe(plain.onBeforeCompile);
    expect(fallback).toBeInstanceOf(MeshLambertMaterial);
  });
});
