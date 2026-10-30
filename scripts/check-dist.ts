// Build audit: `node scripts/check-dist.ts` inspects dist/ after `vite build` and prints
// observed values. Exits 1 on a hard failure (renderer in entry, scene not preloaded, CSS violation,
// poster over budget).
// The ~250 KB total JS gzip figure is a target: a breach is reported loudly, not hidden.
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import { auditCss, type AuditViolation } from '../src/styles/auditCss.ts';

const DIST = new URL('../dist/', import.meta.url);
const JS_GZIP_TARGET_BYTES = 250 * 1024;
const POSTER_BUDGET_BYTES = 60 * 1024;

export function totalGzipBytes(chunks: readonly string[]): number {
  return chunks.reduce((sum, chunk) => sum + gzipSync(chunk).length, 0);
}

export function containsWebGLRenderer(chunk: string): boolean {
  return chunk.includes('WebGLRenderer');
}

export function entryChunkFile(html: string): string {
  const match = /<script[^>]*type="module"[^>]*src="\/assets\/([^"]+\.js)"/.exec(html);
  if (!match) throw new Error('No entry module script found in dist/index.html');
  return match[1] as string;
}

/** Hrefs (relative to dist, no leading slash) of every `<link rel="modulepreload">` in the built html. */
export function modulePreloadHrefs(html: string): string[] {
  const hrefs: string[] = [];
  for (const [tag] of html.matchAll(/<link\b[^>]*>/g)) {
    if (!/\brel="modulepreload"/.test(tag)) continue;
    const href = /\bhref="\/?([^"]+)"/.exec(tag);
    if (href) hrefs.push(href[1] as string);
  }
  return hrefs;
}

/** The scene must be hinted: some preload exists and the preloaded set holds the renderer. */
export function preloadRule(
  hrefs: readonly string[],
  read: (file: string) => string,
): { ok: boolean; reason: string } {
  if (hrefs.length === 0) return { ok: false, reason: 'no modulepreload hint in dist/index.html' };
  if (!hrefs.some((href) => containsWebGLRenderer(read(href)))) {
    return { ok: false, reason: 'preloaded chunks do not contain WebGLRenderer' };
  }
  return { ok: true, reason: 'preloaded set contains WebGLRenderer' };
}

export function auditDistCss(css: string): AuditViolation[] {
  return auditCss(css);
}

export function posterReport(bytes: number): { bytes: number; budgetBytes: number; withinBudget: boolean } {
  return { bytes, budgetBytes: POSTER_BUDGET_BYTES, withinBudget: bytes <= POSTER_BUDGET_BYTES };
}

const kb = (bytes: number): string => `${(bytes / 1024).toFixed(1)} KB`;

function run(): number {
  const assets = new URL('assets/', DIST);
  const files = readdirSync(assets);
  const jsFiles = files.filter((file) => file.endsWith('.js'));
  const cssFiles = files.filter((file) => file.endsWith('.css'));
  const read = (file: string): string => readFileSync(new URL(file, assets), 'utf8');

  let failed = false;

  const html = readFileSync(new URL('index.html', DIST), 'utf8');
  const entry = entryChunkFile(html);
  const jsGz = jsFiles.map((file) => [file, gzipSync(read(file)).length] as const);
  const total = totalGzipBytes(jsFiles.map(read));
  for (const [file, gz] of jsGz) console.log(`js ${file}${file === entry ? ' (entry)' : ''}: ${kb(gz)} gz`);
  const breach = total > JS_GZIP_TARGET_BYTES;
  console.log(`total JS gzip: ${kb(total)} (target ~${kb(JS_GZIP_TARGET_BYTES)}) ${breach ? 'BREACH' : 'ok'}`);

  const entryHasRenderer = containsWebGLRenderer(read(entry));
  console.log(`entry chunk free of WebGLRenderer: ${entryHasRenderer ? 'NO' : 'yes'}`);
  if (entryHasRenderer) failed = true;

  const preload = preloadRule(modulePreloadHrefs(html), (href) => readFileSync(new URL(href, DIST), 'utf8'));
  console.log(`scene chunk modulepreload: ${preload.ok ? 'yes' : 'NO'} (${preload.reason})`);
  if (!preload.ok) failed = true;

  const violations = cssFiles.flatMap((file) => auditDistCss(read(file)));
  console.log(`compiled CSS audit: ${violations.length === 0 ? 'clean' : `${violations.length} violation(s)`}`);
  for (const violation of violations) console.log(`  ${violation.rule}: ${violation.detail}`);
  if (violations.length > 0) failed = true;

  const poster = posterReport(readFileSync(new URL('poster.png', DIST)).length);
  console.log(`poster.png: ${kb(poster.bytes)} (budget ${kb(poster.budgetBytes)}) ${poster.withinBudget ? 'ok' : 'OVER'}`);
  if (!poster.withinBudget) failed = true;

  return failed ? 1 : 0;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exitCode = run();
}
