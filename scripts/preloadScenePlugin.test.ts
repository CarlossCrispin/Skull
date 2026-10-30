// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { preloadScene, sceneModulePreloadHrefs, type BundleLike } from './preloadScenePlugin.ts';

const chunk = (fileName: string, facadeModuleId: string | null, imports: string[] = []) => ({
  type: 'chunk' as const,
  fileName,
  facadeModuleId,
  imports,
});

describe('sceneModulePreloadHrefs', () => {
  it('returns the scene chunk and its static imports, scene first', () => {
    const bundle: BundleLike = {
      'assets/index-a.js': chunk('assets/index-a.js', '/p/src/main.tsx', ['assets/react-b.js']),
      'assets/SkullScene-c.js': chunk('assets/SkullScene-c.js', '/p/src/scene/SkullScene.ts', ['assets/three-d.js']),
      'assets/three-d.js': chunk('assets/three-d.js', null),
    };
    expect(sceneModulePreloadHrefs(bundle)).toEqual(['/assets/SkullScene-c.js', '/assets/three-d.js']);
  });

  it('returns the lone scene chunk with no static imports, matching a Windows-style facade id', () => {
    const bundle: BundleLike = {
      'assets/SkullScene-c.js': chunk('assets/SkullScene-c.js', 'C:\\p\\src\\scene\\SkullScene.ts'),
    };
    expect(sceneModulePreloadHrefs(bundle)).toEqual(['/assets/SkullScene-c.js']);
  });

  it('returns nothing when no chunk is the scene (single-file build)', () => {
    const bundle: BundleLike = { 'assets/index-a.js': chunk('assets/index-a.js', '/p/src/main.tsx') };
    expect(sceneModulePreloadHrefs(bundle)).toEqual([]);
  });

  it('ignores assets, even one named like the scene', () => {
    const bundle: BundleLike = {
      'assets/SkullScene.png': { type: 'asset', fileName: 'assets/SkullScene.png' },
      'poster.png': { type: 'asset', fileName: 'poster.png' },
    };
    expect(sceneModulePreloadHrefs(bundle)).toEqual([]);
  });

  it('does not repeat an import that is already listed', () => {
    const bundle: BundleLike = {
      'assets/SkullScene-c.js': chunk('assets/SkullScene-c.js', '/p/src/scene/SkullScene.ts', [
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
    const hook = plugin.transformIndexHtml as { order: string; handler: (html: string, ctx: unknown) => unknown };
    const bundle: BundleLike = {
      'assets/SkullScene-c.js': chunk('assets/SkullScene-c.js', '/p/src/scene/SkullScene.ts'),
    };
    expect(hook.handler('<html></html>', { bundle })).toEqual([
      { tag: 'link', attrs: { rel: 'modulepreload', crossorigin: '', href: '/assets/SkullScene-c.js' }, injectTo: 'head' },
    ]);
  });

  it('does nothing in dev (no bundle)', () => {
    const hook = preloadScene().transformIndexHtml as { handler: (html: string, ctx: unknown) => unknown };
    expect(hook.handler('<html></html>', {})).toEqual([]);
  });
});
