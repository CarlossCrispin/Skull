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

## Copy research findings (T4, partial, approved adjustments 2026-10-30)
Only UNESCO was checked against a primary source (https://ich.unesco.org/en/RL/indigenous-festivity-dedicated-to-the-dead-00054). The rest comes from press or general knowledge; T4 stays open until each shipped claim has a source.
- Safe: "Inscrita por la UNESCO en 2008 (proclamada en 2003)"; "De fines de octubre a inicios de noviembre"; "Mictlán: inframundo mexica de nueve niveles"; "Papel picado: tradición de San Salvador Huixcolotla, Puebla"; "Posada la creó como Calavera Garbancera; Rivera la bautizó Catrina (mural, 1947)"; "19.4326° N, 99.1332° O".
- Approved rewordings: frame 02 is `//NIVELES_ 2 · 3 · 7 — VARÍAN POR REGIÓN`. Element meanings (cempasúchil, copal, velas, papel picado = viento) are prefixed with "se cree que". Frame 04 shows only `//FECHA_ 01–02.NOV`, with no split by day. Do not use the old UNESCO name or "Obra Maestra".

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
- [x] T2 HUD primitives with tests: `GridLines` (lines plus centered `+` marks), `ConnectorLine` (elbow SVG, non-scaling stroke), `HudCard` (chamfer, reusing ChamferFrame), `DataRow` (`//LABEL_ … VALUE`), `Ruler` (0-100), `Barcode`; entrance keyframes (expo-out) with stagger and reduced-motion off.
- [ ] T3 Frame 00 hero (boot): nav with wordmark and numbered items 01-05 that link to the frames, H1, nodes and connectors pointing at the skull, bottom row with CTA and info card, coordinates, and a ruler bound to scroll progress.
- [ ] T4 Cultural copy research: verify each fact for frames 01-05 (ofrenda levels, elements, cempasúchil role, papel picado, dates, UNESCO year) with sources, and record it in `docs/copy-sources.md`.
- [ ] T5 Frames 01-04 with the verified copy, HUD layout and scroll reveal.
- [ ] T6 Frame 05 close: skull reassembly range, countdown to Nov 2, barcode and signature.
- [ ] T7 Display font (Neotriad-like, licensed for web) and accent tokens.
- [ ] T8 Verification: full tests, build, check:dist, and a browser pass at 320/390/768/1024/1440 (overflow, contrast, motion).

## Delivery
Forecast: well above 400 authored changed lines, so the feature needs slicing. Delivery strategy: ask-on-risk; chain strategy: stacked-to-main (user, 2026-10-30). Review boundary: fb52cc8 (bootstrap root commit, scaffold copied from reviewed Skull code). Remote: origin `CarlossCrispin/Skull.git`; push and PRs stay the user's decision.

## Review log
- T1: fb52cc8 bootstrap boundary; 9083c34 passive.
- T2: dae30d0 + 82de452, assessed as a slice from 3cf9188: medium (909 lines), native says under_budget, so deferred to slice. A per-commit assess with --head-ref is unsupported and its result was discarded.

## Progress
- 2026-10-30: scaffold copied from Skull, git init (main, no commits), remote added, `npm ci` done. Baseline does not compile yet (T1).
- 2026-10-30: T1 done in commit fb52cc8 on `feat/protocolo-ofrenda`. `npx vitest run`: 72 files / 849 tests passed; `npm run typecheck`: clean; `npm run build && npm run check:dist`: ok (CSS audit clean, 204.4 KB gz JS).
- 2026-10-30: T2 done in dae30d0 (static primitives: GridLines, ConnectorLine/ElbowConnector, HudCard, DataRow, Ruler, Barcode + `src/lib/hud/barcode.ts`) and 82de452 (hud-* entrance utilities, `hudDelay`, `animated`/`draw` props; the opacity policy in `auditCss.test.ts` now allows `hud-` rules and `@keyframes hud-`). Verification: `npx vitest run`: 81 files / 909 tests passed; `npm run typecheck`: clean; `npm run build && npm run check:dist`: ok (CSS audit clean, 204.4 KB gz JS). Authored lines: dae30d0 +572, 82de452 +355/-25 (both include tests).

## Next step
T3.
