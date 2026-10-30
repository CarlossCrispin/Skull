// Build-time poster: `node scripts/build-poster.js` writes public/poster.png.
// Same voxel model, camera, light and lattice as the WebGL scene; no browser needed.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { encodeIndexedPng } from '../src/scene/poster/png.js';
import { rasterizeSkull } from '../src/scene/poster/rasterize.js';
import { generateSkull } from '../src/scene/voxel/generate.js';

const OUTPUT = fileURLToPath(new URL('../public/poster.png', import.meta.url));

/** The assembled static pose as PNG bytes; deterministic for a given zlib build. */
export function buildPosterPng() {
  return encodeIndexedPng(rasterizeSkull(generateSkull()));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const bytes = buildPosterPng();
  mkdirSync(dirname(OUTPUT), { recursive: true });
  writeFileSync(OUTPUT, bytes);
  console.log(`poster.png: ${bytes.length} bytes`);
}
