// Build-time hint for the lazily imported scene: Vite hashes chunk names, so the
// `modulepreload` link cannot be written by hand in index.html (design Decision 19).
import type { Plugin } from 'vite';

export type BundleEntry =
  | { type: 'chunk'; fileName: string; facadeModuleId: string | null; imports: readonly string[] }
  | { type: 'asset'; fileName: string };

export type BundleLike = Record<string, BundleEntry>;

const SCENE_ENTRY = /src\/scene\/SkullScene\.ts$/;

/** Hrefs of the scene chunk followed by its static imports (three may be split out); `[]` when absent. */
export function sceneModulePreloadHrefs(bundle: BundleLike): string[] {
  for (const entry of Object.values(bundle)) {
    if (entry.type !== 'chunk' || entry.facadeModuleId === null) continue;
    if (!SCENE_ENTRY.test(entry.facadeModuleId.replaceAll('\\', '/'))) continue;
    return [...new Set([entry.fileName, ...entry.imports])].map((file) => `/${file}`);
  }
  return [];
}

/** Injects `<link rel="modulepreload" crossorigin>` for the scene chunk in production builds only. */
export function preloadScene(): Plugin {
  return {
    name: 'preload-scene',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(_html, ctx) {
        const bundle = ctx.bundle as unknown as BundleLike | undefined;
        if (bundle === undefined) return [];
        return sceneModulePreloadHrefs(bundle).map((href) => ({
          tag: 'link',
          attrs: { rel: 'modulepreload', crossorigin: '', href },
          injectTo: 'head' as const,
        }));
      },
    },
  };
}
