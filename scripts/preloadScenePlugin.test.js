// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { preloadScene, sceneModulePreloadHrefs } from './preloadScenePlugin.js';

const chunk = (fileName, facadeModuleId, imports = []) => ({
  type: 'chunk',
  fileName,
  facadeModuleId,
  imports,
});

describe('sceneModulePreloadHrefs', () => {
  it('returns the scene chunk and its static imports, scene first', () => {
    const bundle = {
      'assets/index-a.js': chunk('assets/index-a.js', '/p/src/main.jsx', ['assets/react-b.js']),
      'assets/SkullScene-c.js': chunk('assets/SkullScene-c.js', '/p/src/scene/SkullScene.js', ['assets/three-d.js']),
      'assets/three-d.js': chunk('assets/three-d.js', null),
    };
    expect(sceneModulePreloadHrefs(bundle)).toEqual(['/assets/SkullScene-c.js', '/assets/three-d.js']);
  });

  it('returns the lone scene chunk with no static imports, matching a Windows-style facade id', () => {
    const bundle = {
      'assets/SkullScene-c.js': chunk('assets/SkullScene-c.js', 'C:\\p\\src\\scene\\SkullScene.js'),
    };
    expect(sceneModulePreloadHrefs(bundle)).toEqual(['/assets/SkullScene-c.js']);
  });

  it('returns nothing when no chunk is the scene (single-file build)', () => {
    const bundle = { 'assets/index-a.js': chunk('assets/index-a.js', '/p/src/main.jsx') };
    expect(sceneModulePreloadHrefs(bundle)).toEqual([]);
  });

  it('ignores assets, even one named like the scene', () => {
    const bundle = {
      'assets/SkullScene.png': { type: 'asset', fileName: 'assets/SkullScene.png' },
      'poster.png': { type: 'asset', fileName: 'poster.png' },
    };
    expect(sceneModulePreloadHrefs(bundle)).toEqual([]);
  });

  it('does not repeat an import that is already listed', () => {
    const bundle = {
      'assets/SkullScene-c.js': chunk('assets/SkullScene-c.js', '/p/src/scene/SkullScene.js', [
        'assets/three-d.js',
        'assets/three-d.js',
      ]),
    };
    expect(sceneModulePreloadHrefs(bundle)).toEqual(['/assets/SkullScene-c.js', '/assets/three-d.js']);
  });
});

describe('preloadScene plugin', () => {
  it('injects crossorigin modulepreload links in the head from the bundle, build only', () => {
    const plugin = preloadScene();
    const hook = plugin.transformIndexHtml;
    const bundle = {
      'assets/SkullScene-c.js': chunk('assets/SkullScene-c.js', '/p/src/scene/SkullScene.js'),
    };
    expect(hook.handler('<html></html>', { bundle })).toEqual([
      { tag: 'link', attrs: { rel: 'modulepreload', crossorigin: '', href: '/assets/SkullScene-c.js' }, injectTo: 'head' },
    ]);
  });

  it('does nothing in dev (no bundle)', () => {
    const hook = preloadScene().transformIndexHtml;
    expect(hook.handler('<html></html>', {})).toEqual([]);
  });
});
