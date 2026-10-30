# Feature: protocolo-ofrenda-landing

## Objective
A conceptual cyberpunk landing about Día de Muertos ("Protocolo Ofrenda"): the voxel skull from Skull is the core, and HUD frames with text and numbers pass by as the user scrolls.

## Problem / why
Skull2.0 starts from the Skull codebase without the calaverita poem. It leans further into cyberpunk with HUD panels, data rows, rulers, barcodes and connectors. References are in `Referencias/` (4 images) plus the user's motionsite prompt "LŪMEN // ÍNDEX", used only as a visual and motion language.

## Approved structure (user, 2026-10-30)
| Frame | Title | HUD data |
|---|---|---|
| 00 | Boot: the skull assembles | `//SYS_ MICTLAN.OS`, `19.4326°N 99.1332°W`, a 0-100 ruler bound to scroll |
| 01 | CEMPASÚCHIL | `//FUNCIÓN_ GUÍA DE ALMAS`, orange accent |
| 02 | OFRENDA | `//NIVELES_ 2 · 3 · 7`, elements (agua, sal, pan, copal, velas) |
| 03 | PAPEL PICADO | `//ELEMENTO_ AIRE`, cut-paper pattern texture |
| 04 | CALAVERA | `//FECHA_ 01–02.NOV`, countdown to Nov 2 |
| 05 | Close: the skull reassembles | `//PATRIMONIO_ UNESCO`, barcode, signature |

## Scope
- In: skull scene and motion (reused), HUD primitives, frames 00-05, verified cultural copy, display font, build checks.
- Out: the calaverita poem; the motionsite CloudFront video; the Graphik font (licensing unclear); any backend.

## Constraints
- The copy is Spanish (Mexican tradition). Code, identifiers and comments are in English.
- Every cultural fact is verified against a primary or reputable source before it ships, with no invented data.
- Existing design rules stay unless a task changes them explicitly: token palette, CSS audit, the glass card and reduced motion.
- Motion language from the motionsite prompt: expo-out `cubic-bezier(0.16,1,0.3,1)` for entrances, expo-in-out `cubic-bezier(0.76,0,0.24,1)` for interactions, gutter 20 px / 35 px at md, labels and connectors before the boxes they point to.
- Advisory: about 400 authored changed lines per task (heuristic only).

## TDD
Mode: strict (source: the user's global CLAUDE.md "Strict TDD Mode: enabled"). Runner: `npx vitest run` (Vitest 5). RED, then GREEN, then REFACTOR.

## Checks per task
`npx vitest run`, `npm run typecheck`, and from T2 on `npm run build && npm run check:dist`.

## Tasks
- [x] T1 Baseline green without the poem. Remove the calaverita wiring (`src/components/page/sections.ts` and the tests that reference the poem: PageShell, AssemblyRange, fontCoverage, stagger, useRevealGroup). Retarget the scroll anchor that depended on the poem signature to a neutral placeholder frame. Set the page title and meta to the new concept. Remove calaverita mentions from the glass constants comments and from the openspec specs page-shell and design-system (or mark them legacy). Everything goes green, then the initial commit lands on branch `feat/protocolo-ofrenda`.
- [ ] T2 HUD primitives with tests: `GridLines` (lines plus centered `+` marks), `ConnectorLine` (elbow SVG, non-scaling stroke), `HudCard` (chamfer, reusing ChamferFrame), `DataRow` (`//LABEL_ … VALUE`), `Ruler` (0-100), `Barcode`; entrance keyframes (expo-out) with stagger and reduced-motion off.
- [ ] T3 Frame 00 hero (boot): nav with wordmark and numbered items 01-05 that link to the frames, H1, nodes and connectors pointing at the skull, bottom row with CTA and info card, coordinates, and a ruler bound to scroll progress.
- [ ] T4 Cultural copy research: verify each fact for frames 01-05 (ofrenda levels, elements, cempasúchil role, papel picado, dates, UNESCO year) with sources, and record it in `docs/copy-sources.md`.
- [ ] T5 Frames 01-04 with the verified copy, HUD layout and scroll reveal.
- [ ] T6 Frame 05 close: skull reassembly range, countdown to Nov 2, barcode and signature.
- [ ] T7 Display font (Neotriad-like, licensed for web) and accent tokens.
- [ ] T8 Verification: full tests, build, check:dist, and a browser pass at 320/390/768/1024/1440 (overflow, contrast, motion).

## Delivery
Forecast: well above 400 authored changed lines, so the feature needs slicing. Chain strategy: PENDING (ask-on-risk). Remote: origin `CarlossCrispin/Skull.git`; push and PRs stay the user's decision.

## Progress
- 2026-10-30: scaffold copied from Skull, git init (main, no commits), remote added, `npm ci` done. Baseline does not compile yet (T1).
- 2026-10-30: T1 done in commit fb52cc8 on `feat/protocolo-ofrenda`. `npx vitest run`: 72 files / 849 tests passed; `npm run typecheck`: clean; `npm run build && npm run check:dist`: ok (CSS audit clean, 204.4 KB gz JS).

## Next step
T2.
