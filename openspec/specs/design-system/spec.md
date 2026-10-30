> Legacy (Skull): poem requirements no longer apply in Skull2.0; superseded by odd/tasks/protocolo-ofrenda-landing.md.

# Design System Specification

> Change: `voxel-skull-landing` · New capability (greenfield; no existing spec).
> Sources: `docs/01-discovery-visual.md` §5, §6, §8 (approved), `docs/03-analisis-motionsites.md` §2.1, §2.2.
> Legend: **[APPROVED]** = user-approved in docs 01-03. **[DEFAULT-PENDING]** = proposed by the orchestrator, NOT user-approved; must be confirmed or changed at spec review.

## Purpose

Define the visual tokens and consistency rules every other capability consumes: palette, typography, gutters, exposed grid and the prohibitions (no radii, no UI shadows, no gradients). The page is light-first (`#F8F8F8`). The dark altar section is out of scope and MUST NOT be implemented in this change.

## Requirements

### Requirement: Approved palette tokens only [APPROVED]

The system MUST expose exactly the following color tokens, with exactly these hex values, through the Tailwind 4 `@theme` block:

| Token | Hex | Role |
|---|---|---|
| `--color-bg` | `#F8F8F8` | Page background |
| `--color-bg-alt` | `#EDEDED` | Bands and dividers |
| `--color-ink` | `#0A0A0A` | Text |
| `--color-gray-700` | `#2B2B2C` | Dark volume in 3D |
| `--color-gray-400` | `#888888` | Secondary text and lines |
| `--color-gray-200` | `#D8D8D8` | Grid lines and 1 px borders |
| `--color-accent` | `#8E4AF2` | Violet accent |
| `--color-signal` | `#E2680A` | Cempasuchil orange signal (replaces R0 lime) |

The Tailwind default palette MUST be reset (`--color-*: initial`) so that no other color utility exists. The lime `#E1F858` MUST NOT appear anywhere. No more than two accents (`--color-accent`, `--color-signal`) MAY be active.

#### Scenario: Compiled CSS contains only approved colors
- GIVEN the production build output
- WHEN every color literal in the compiled CSS and in authored style files is enumerated
- THEN each is one of the eight hex values above, or `transparent`, `currentColor` or `inherit`
- AND no Tailwind default palette class (for example `bg-red-500`) resolves to a color

#### Scenario: Lime is absent
- GIVEN the repository source and the build output
- WHEN searching case-insensitively for `E1F858`
- THEN there are zero matches

#### Scenario: Token values are exact
- GIVEN the theme stylesheet
- WHEN the computed value of each token is read
- THEN it equals the hex in the table (for example `--color-signal` is `#E2680A`)

### Requirement: Contrast pairing rules [APPROVED; numeral size confirmed by user 2026-10-27]

`--color-signal` MUST carry only `--color-ink` text (never white). `--color-accent` MAY be used for text on `--color-bg` only for the `/01`-`/04` numerals. Because `#8E4AF2` on `#F8F8F8` computes to about 4.48:1 (below 4.5:1 for normal text), the numerals MUST be rendered at a computed font-size of at least 24 px so they qualify as WCAG large text (3:1 minimum). The ratio MUST still be measured with a tool and recorded in the verification report.

#### Scenario: Orange never carries white text
- GIVEN any element with `--color-signal` as background
- WHEN its text color is read
- THEN the text color is `--color-ink`

#### Scenario: Violet numeral contrast is measured
- GIVEN the rendered `/01` numeral at its specified size
- WHEN contrast against `#F8F8F8` is computed with a tool
- THEN the ratio is reported in the verification output
- AND the numeral's computed font-size is at least 24 px
- AND the ratio is at least 3:1

### Requirement: Typography [APPROVED]

The system MUST use exactly two font families: **Anton** (display) and **JetBrains Mono** (text and UI). Anton MUST be used only in uppercase (via `text-transform`; the source text keeps its original case). Labels MUST be uppercase mono; paragraphs MUST be mixed-case mono. Mono labels (signature) MUST use letter-spacing `0.15em` and a size between 10 px and 11 px. The `/01`-`/04` numerals MUST use JetBrains Mono with letter-spacing `0.15em` at a size of at least 24 px (see Contrast pairing rules). Display scale SHOULD be roughly 8-10 times the body size. Inter and any other family MUST NOT be present. Only the weights actually used SHALL be loaded.

#### Scenario: Only two families are declared
- GIVEN the compiled CSS
- WHEN all `font-family` declarations and `@font-face` rules are listed
- THEN the only families are Anton and JetBrains Mono, each with a generic fallback (`sans-serif`, `monospace`)

#### Scenario: Display text is uppercase
- GIVEN the `h1` title rendered in Anton
- WHEN its computed `text-transform` is read
- THEN it is `uppercase`
- AND the DOM text content is unchanged from the approved copy

#### Scenario: Spanish glyph coverage
- GIVEN the self-hosted font files
- WHEN the poem text is rendered
- THEN the glyphs n-tilde, acute vowels, inverted question and exclamation marks, guillemets and em dash render from the intended families without fallback substitution (verified visually; any missing glyph is reported as a defect)

### Requirement: Self-hosted fonts [DEFAULT-PENDING #7]

Fonts SHOULD be self-hosted (`@fontsource`, same Google families, latin subset, used weights only) so that no third-party runtime request is made. The implementation MUST set `font-display` so text is never invisible for long, and SHOULD preload only the display font used above the fold.

#### Scenario: No third-party font request
- GIVEN the page loaded in a browser with network recording
- WHEN requests are listed
- THEN no request targets a font CDN host

### Requirement: Responsive gutters [APPROVED]

Horizontal page gutters MUST be 20 px below Tailwind's `sm` breakpoint (640 px), 32 px from `sm` up to below `md` (768 px), and 48 px from `md` upward. The page MUST NOT produce horizontal scroll at any viewport width from 320 px upward.

#### Scenario: Gutter per breakpoint
- GIVEN viewport widths of 375, 700 and 1024 CSS px
- WHEN the horizontal padding of the content container is read
- THEN it is 20 px, 32 px and 48 px respectively

#### Scenario: No horizontal overflow
- GIVEN viewport widths of 320, 375, 768, 1024 and 1440 px
- WHEN `document.documentElement.scrollWidth` is compared with `clientWidth`
- THEN they are equal (no horizontal scroll)

### Requirement: Exposed grid overlay [APPROVED: Stage 01 rule; confirmed with lattice 2026-10-27]

The system SHOULD render exposed grid lines (1 px, `--color-gray-200`) and `+` crosshair marks as a CSS overlay, as a decorative layer that is `aria-hidden` and non-interactive (`pointer-events: none`). System-metadata ornaments (`SYS.TIME`, `//SCN_01`, coordinates and similar) MUST NOT be added: all visible text comes from the script. The overlay MUST NOT use shadows, gradients or transparency effects.

#### Scenario: Grid overlay is decorative
- GIVEN the rendered page
- WHEN the grid/crosshair layer is inspected
- THEN it is `aria-hidden="true"`, ignores pointer events, and contains no text nodes

#### Scenario: No invented copy
- GIVEN the page's visible text content
- WHEN compared with the set of approved strings (calaverita text, plus the NEW COPY alt text once approved, which is not visible text)
- THEN no other visible text exists

### Requirement: Consistency prohibitions [APPROVED]

The system MUST NOT use in the UI: border radius other than `0` (straight chamfers are permitted), `box-shadow`, `text-shadow`, `drop-shadow`, gradients, glow, neon, glassmorphism, `backdrop-filter`, or decorative transparency. Accent colors MUST be applied as flat blocks. Lighting inside the WebGL canvas is exempt. `lucide-react` MUST NOT be a dependency. No NovaAI identity, copy or assets MAY be present. Photographs MUST NOT be used (R1-R7 are inspiration only).

#### Scenario: No radius, shadow or gradient in the build
- GIVEN the compiled CSS
- WHEN searching for `border-radius`, `box-shadow`, `text-shadow`, `drop-shadow`, `gradient(`, `backdrop-filter`, `blur(`
- THEN there are no authored declarations with a non-zero or non-`none` value

#### Scenario: No forbidden dependency
- GIVEN `package.json`
- WHEN dependencies are listed
- THEN `lucide-react` and `@react-three/fiber` are absent

### Requirement: Single light surface in this change [APPROVED scope]

All sections delivered by this change MUST use `--color-bg` as the background and `--color-ink` as the text color. The dark altar section MUST NOT be implemented (deferred by the user).

#### Scenario: No dark section
- GIVEN the full page
- WHEN the background color of every section is read
- THEN none is `--color-ink` or any dark value
