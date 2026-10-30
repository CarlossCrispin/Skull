> Legacy (Skull): poem requirements no longer apply in Skull2.0; superseded by odd/tasks/protocolo-ofrenda-landing.md.

# Page Shell Specification

> Change: `voxel-skull-landing` · New capability.
> Sources: proposal.md; `docs/02-analisis-guion.md` §2-§5 (script v2); `docs/03-analisis-motionsites.md` §2.1.
> Legend: **[APPROVED]** user-approved. **[DEFAULT-PENDING]** proposed, not approved.

## Purpose

Define the information architecture, page composition, semantic landmarks, extensibility and global motion-preference handling. Audience (approved): the BlackHole team, internal use. Objective: a Day of the Dead celebratory piece presenting a calaverita literaria. Primary action: none (watch and read).

## Requirements

### Requirement: Page composition [APPROVED]

The page MUST consist of exactly two stacked blocks in this order: Block A (voxel skull hero) then Block B (calaverita). There MUST be no navigation bar, no footer, no CTA, no drawer and no interactive controls. The document MUST declare `lang="es"`. Scrolling MUST be the native browser scroll (no scroll hijacking, no smooth-scroll library).

#### Scenario: Block order
- GIVEN the rendered document
- WHEN top-level sections are listed in DOM order
- THEN Block A precedes Block B and there are no other visible sections

#### Scenario: No interactive elements
- GIVEN the rendered document
- WHEN querying for `a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])`
- THEN there are zero matches
- AND `document.documentElement.lang` is `es`

#### Scenario: Native scroll
- GIVEN the page loaded
- WHEN the user scrolls with wheel, touch or keyboard (PageDown, Space, arrow keys)
- THEN the browser scrolls natively and no handler calls `preventDefault` on scroll-initiating events

### Requirement: Block A dimensions [APPROVED]

Block A MUST have a height of `100svh` (with a `100vh` fallback) so the mobile browser UI bar does not crop the skull. Block A MUST NOT contain visible text. The skull is centered, with ample empty space.

#### Scenario: Block A fills the first viewport
- GIVEN viewports of 1440x900 and 390x844
- WHEN the page loads at scrollY 0
- THEN Block A's bounding height equals the viewport height (`100svh`) and its visible text content is empty

### Requirement: No scroll indicator [DEFAULT-PENDING #2]

Block A SHOULD NOT contain a scroll indicator. If the user approves one, it MUST be a separate, justified addition that does not alter other requirements.

#### Scenario: No indicator by default
- GIVEN the default build
- WHEN Block A's descendants are inspected
- THEN no scroll-hint element exists

### Requirement: Semantic structure and landmarks [APPROVED]

The page MUST use a `<main>` landmark containing Block A and Block B as sibling sections. There MUST be exactly one `h1`, the poem title, inside Block B. Block A MUST expose an accessible name/description for the 3D content as defined in `voxel-skull-scene`. Decorative layers (grid overlay, voxel icons, numerals) MUST be `aria-hidden`.

#### Scenario: Single h1 and landmark
- GIVEN the rendered document
- WHEN headings and landmarks are listed
- THEN there is one `main`, exactly one `h1`, and the `h1` lies within Block B

### Requirement: Extensible section registry [APPROVED]

Sections MUST be composed from an ordered list so a future section (for example the dark altar) can be appended after Block B by adding one entry, without modifying the implementation of Block A or Block B.

#### Scenario: Appending a section
- GIVEN a test that adds a stub section entry after Block B
- WHEN the page shell renders
- THEN the stub renders after Block B
- AND the markup of Block A and Block B is identical to the render without the stub

### Requirement: Global reduced-motion detection [APPROVED]

The page MUST read `prefers-reduced-motion: reduce` via `matchMedia` on mount and MUST subscribe to its `change` event, exposing the value to Block A and Block B. The listener MUST be removed on unmount.

#### Scenario: Initial value
- GIVEN `matchMedia('(prefers-reduced-motion: reduce)').matches` is `true`
- WHEN the page mounts
- THEN the shared reduced-motion state is `true` before animated content is first shown

#### Scenario: Live change
- GIVEN the page is mounted with reduced motion `false`
- WHEN the media query fires a `change` event with `matches: true`
- THEN consumers switch to the reduced-motion behavior without a reload

#### Scenario: Listener cleanup
- GIVEN the page was mounted and then unmounted
- WHEN the media query later fires `change`
- THEN no handler runs

### Requirement: Lazy 3D loading with text-first paint [DEFAULT-PENDING #8]

The `three` code SHOULD be loaded in a separate lazily loaded chunk. Block B text and the Block A poster MUST be able to paint before the three chunk finishes loading.

#### Scenario: Text paints before three loads
- GIVEN network throttling that delays the three chunk
- WHEN the page loads
- THEN Block A shows the poster and Block B text exists in the DOM before the three chunk resolves

### Requirement: Build and tooling [APPROVED stack; versions DEFAULT-PENDING #10]

The project MUST build with `vite build` with no errors and TypeScript `strict` enabled. Dependencies SHOULD be pinned to exact versions (three 0.186.1, vite 8.3.5, tailwindcss 4.3.3, react 19.3.1, vitest 5.0.5). A root `npm test` script MUST run Vitest. `openspec/config.yaml` MUST be updated (`strict_tdd: true`, `testing.runner: vitest`, `test_command: npm test`) as the first work unit.

#### Scenario: Build passes
- GIVEN a clean install
- WHEN `npm run build` runs
- THEN it exits 0 with no TypeScript errors

#### Scenario: Test command exists
- GIVEN the repository root
- WHEN `npm test` runs
- THEN Vitest executes and exits 0 when all tests pass
