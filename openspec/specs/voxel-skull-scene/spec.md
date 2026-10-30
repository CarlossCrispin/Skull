# Voxel Skull Scene Specification

> Change: `voxel-skull-landing` · New capability.
> Sources: `docs/01-discovery-visual.md` §2.3, §7; `docs/02-analisis-guion.md` §5; `docs/03-analisis-motionsites.md` §2.1, §4; exploration.md.
> Legend: **[APPROVED]** user-approved. **[DEFAULT-PENDING #n]** proposed by the orchestrator, NOT user-approved (n = number in the proposal table). **[ESTIMATE]** figure taken from exploration, to be measured.

## Purpose

Define the real-time voxel skull (Block A object): procedural geometry, material and lighting, accent cubes, optional wireframe lattice, poster and failure states, renderer lifecycle and performance budget. Motion (rotation, drift, scrub) is specified in `skull-motion`. Implementation choices (vanilla three behind a React component, SDF approach) belong to the design phase.

## Requirements

### Requirement: Real-time voxel skull geometry [APPROVED]

The skull MUST be generated procedurally as a set of cubes rendered in real time as a single instanced mesh. The front view MUST read as a skull: cranium, eye sockets, inverted nasal cavity, cheekbones, maxilla with a gapped tooth grid, and mandible. The object MUST be densest at the center and fragment toward its edges. The generator MUST be deterministic (the same seed yields identical output), X-symmetric except for the seeded edge fragmentation, which MUST preserve the symmetric core.

#### Scenario: Determinism
- GIVEN the generator invoked twice with the same seed and parameters
- WHEN the two outputs (instance positions and attributes) are compared
- THEN they are identical

#### Scenario: Symmetry of the core
- GIVEN the generated voxel set without edge fragmentation
- WHEN every voxel at (x, y, z) is mirrored about the sagittal plane
- THEN the mirrored position is also in the set

#### Scenario: Legible front view (golden fixture)
- GIVEN the generator output projected to a front-view occupancy mask
- WHEN compared with the committed golden ASCII mask fixture
- THEN they match exactly
- AND the fixture visibly contains two separate eye-socket voids and one nasal void (checked by connected-component count of empty regions inside the silhouette >= 3)

### Requirement: Empty sockets and shell-only voxels [APPROVED]

Eye-socket and nasal-cavity volumes MUST contain no skull voxels. Only shell voxels (voxels with at least one empty 6-neighbor) MUST be emitted; fully interior voxels MUST NOT be instanced.

#### Scenario: Sockets are empty
- GIVEN the eye-socket and nasal regions defined by the generator
- WHEN voxel positions inside those regions are queried
- THEN the result is empty (accent cubes excepted, see below)

#### Scenario: No interior voxels
- GIVEN the emitted instance set
- WHEN each instance's six neighbors are checked against the set
- THEN every instance has at least one neighbor position absent from the full (pre-shell) volume

### Requirement: Instance and draw-call budget [APPROVED intent; figures ESTIMATE]

The skull MUST be rendered with 1 draw call (2 when the wireframe lattice is enabled). The instance count MUST NOT exceed 12,000 (including accent cubes). The generation time at startup SHOULD be measured and reported; if it blocks the main thread longer than 50 ms on the reference desktop, the design phase decides on baking or off-thread generation.

#### Scenario: Budget check
- GIVEN the generator output with the default seed
- WHEN the instance count is read
- THEN it is <= 12,000
- AND the renderer reports <= 2 draw calls per frame (`renderer.info.render.calls`) in the scene-controller test with the lattice enabled, and 1 with it disabled

### Requirement: Material and lighting [APPROVED look; technique DEFAULT-PENDING]

The material MUST be matte: no specular highlights, no emissive glow, no reflections, no transparency on skull cubes. Faces MUST carry grayscale data/noise texture (R0 "data texture" look) with nearest-neighbor filtering; if the texturing technique fails to compile, the system MUST fall back to flat per-instance grayscale colors without throwing. Lighting MUST be one lateral directional light plus low ambient, so volume is revealed through tonal contrast. Skull tones MUST stay within the grayscale tokens (`#2B2B2C` to `#D8D8D8` range, with `#F8F8F8`-adjacent highlights allowed only via lighting). The scene background MUST be transparent so the page's `#F8F8F8` shows through; no scene fog, gradient or bloom.

#### Scenario: Matte material
- GIVEN the skull material
- WHEN its specular, emissive and transparency properties are read
- THEN specular is absent or zero, emissive is black, and `transparent` is false

#### Scenario: Fallback on shader patch failure
- GIVEN the texture-sampling patch is forced to fail (test double)
- WHEN the scene initializes
- THEN the scene renders with the flat grayscale instance colors
- AND no uncaught error is raised

#### Scenario: Light rig
- GIVEN the constructed scene graph
- WHEN lights are listed
- THEN there is exactly one directional light and one ambient light, and no shadow-casting light

### Requirement: Accent cubes [APPROVED 2026-10-27: viewer-left socket 3 violet `#8E4AF2`, viewer-right socket 3 cempasúchil `#E2680A`]

Accent cubes MUST be placed within the eye sockets. Their color MUST be exactly `#8E4AF2` and `#E2680A` (one accent each: viewer-left socket violet, viewer-right socket orange, front view), rendered unlit and flat so the exact hex is displayed (not a shaded variant). Accent cubes MUST count toward the instance budget.

#### Scenario: Exact accent color
- GIVEN the accent cubes' material/instance colors
- WHEN their final color is read
- THEN it equals `#8E4AF2` or `#E2680A` exactly, and the material is unlit

### Requirement: Wireframe lattice [APPROVED: enabled by default, confirmed by user 2026-10-27]

A thin 3D wireframe lattice SHOULD surround the skull (1 extra draw call). It MUST use `--color-gray-200` or `--color-gray-400`, MUST be removable by a single flag without affecting other behavior, and MUST NOT use transparency effects beyond what thin lines inherently have.

#### Scenario: Lattice toggle
- GIVEN the scene with the lattice flag off
- WHEN the scene graph and draw calls are inspected
- THEN the lattice mesh is absent and draw calls equal 1

### Requirement: Poster and loading state [APPROVED pattern; crossfade numbers APPROVED]

Block A MUST show a static poster image of the skull from first paint while the 3D chunk loads and the scene initializes. When the first WebGL frame has been rendered, the canvas MUST fade in over the poster with a 500 ms cross-fade, after which the poster is hidden (not removed from the DOM, so it can return on failure). The poster MUST be visually aligned with the canvas initial pose (same framing) so no visible jump occurs. The poster file size MUST be <= 60 KB. The poster MAY be generated from the voxel data (DEFAULT-PENDING #6); capturing the real canvas with Playwright is pending a user decision on that dependency.

#### Scenario: Poster first
- GIVEN a slow network where the three chunk is delayed
- WHEN the page loads
- THEN the poster is visible in Block A and the canvas has opacity 0

#### Scenario: Cross-fade
- GIVEN the scene rendered its first frame
- WHEN the cross-fade starts
- THEN the canvas opacity transitions from 0 to 1 over 500 ms (+/- one frame) and the poster is hidden after completion

#### Scenario: Poster budget
- GIVEN the built poster asset
- WHEN its size is measured
- THEN it is <= 60 KB

### Requirement: "Appears" behavior [DEFAULT-PENDING #3]

The skull's appearance SHOULD be the poster -> canvas cross-fade plus a short scale/opacity settle that does not exceed the 500 ms cross-fade window. A voxel-assemble effect MUST NOT be implemented.

#### Scenario: No assemble effect
- GIVEN the scene source and runtime
- WHEN the initial reveal runs
- THEN no per-instance staggered animation occurs; instance transforms are static at reveal

### Requirement: WebGL failure and context loss [APPROVED]

If WebGL is unavailable or renderer creation fails, the poster MUST remain visible, no error UI or text is added, and the page MUST remain fully usable. On `webglcontextlost`, the loop MUST stop, the event default MUST be prevented (to allow restoration), and the poster MUST be shown. On `webglcontextrestored` the scene SHOULD reinitialize and cross-fade back; if reinitialization fails the poster remains.

#### Scenario: WebGL unavailable
- GIVEN `getContext('webgl2')`/renderer construction throws (test double)
- WHEN Block A mounts
- THEN the poster stays visible, no exception propagates, and Block B renders normally

#### Scenario: Context lost
- GIVEN a running scene
- WHEN the canvas dispatches `webglcontextlost`
- THEN no further frames are requested, the poster is visible again, and `preventDefault` was called on the event

#### Scenario: Context restored
- GIVEN the context was lost and then `webglcontextrestored` fires
- WHEN reinitialization succeeds
- THEN the canvas cross-fades back over 500 ms and the loop resumes; if it fails the poster remains

### Requirement: Rendering pause and resume [APPROVED]

The scene MUST NOT submit any GPU frame while Block A is fully outside the viewport (observed with IntersectionObserver) or while `document.visibilityState` is `hidden`. On return it MUST resume without restarting the intro timeline (see `skull-motion`). DPR MUST be capped: `min(devicePixelRatio, 2)`. The canvas MUST resize with its container, updating renderer size, camera aspect and DPR.

#### Scenario: Offscreen pause
- GIVEN the scene is running and Block A is visible
- WHEN the intersection observer reports Block A not intersecting
- THEN `renderer.render` is not called on any subsequent animation tick until it intersects again

#### Scenario: Hidden tab pause
- GIVEN the scene is running
- WHEN `visibilitychange` fires with `visibilityState === 'hidden'`
- THEN no `renderer.render` call occurs until the tab becomes visible

#### Scenario: DPR cap
- GIVEN `devicePixelRatio` of 3
- WHEN the renderer is configured
- THEN the pixel ratio equals 2
- AND with `devicePixelRatio` of 1.5 it equals 1.5

#### Scenario: Resize
- GIVEN a viewport resize from 1440x900 to 390x844
- WHEN the resize is handled
- THEN the camera aspect equals the new container aspect and the renderer size equals the container size

### Requirement: Disposal and lifecycle [APPROVED]

On unmount, hot reload or StrictMode double-mount, the scene MUST cancel its animation frame, disconnect observers, remove event listeners (resize, visibilitychange, context events), and dispose geometry, materials, textures and the renderer, so that no WebGL context leaks. A double mount/unmount MUST end with exactly one live renderer.

#### Scenario: Dispose
- GIVEN a scene controller created with a fake renderer
- WHEN `dispose()` is called
- THEN the fake renderer's `dispose` was called, the pending frame callback was cancelled, and all registered listeners/observers were removed

#### Scenario: StrictMode double mount
- GIVEN mount, unmount, mount in sequence
- WHEN the sequence completes
- THEN exactly one renderer is alive and no listeners from the first mount remain

### Requirement: Accessible description of the 3D object [NEW COPY, requires user approval]

Block A MUST expose the 3D content as a single image-role element with an accessible name; the canvas and poster inside MUST be `aria-hidden` to avoid duplicate announcements. The accessible text is **NEW COPY** that does not exist in the approved script (the script rule "all visible text comes from the script" is not violated because the text is not visible, but approval is still required). Until the user approves, the draft below is a placeholder and MUST NOT be treated as final.

> **Alt text (NEW COPY, approved by user 2026-10-26, Spanish):**
> "Calavera tridimensional hecha de cubos, suspendida en el espacio y en lento giro sobre su eje vertical."

#### Scenario: Single accessible node
- GIVEN the rendered Block A
- WHEN the accessibility tree is read
- THEN there is exactly one `role="img"` node with the approved alt text as its name
- AND canvas and poster are `aria-hidden="true"`

#### Scenario: Copy approval gate
- GIVEN the verification report
- WHEN the alt text is listed
- THEN it is marked "NEW COPY" with approved/pending status; "pending" means the item is open, not passed

### Requirement: Performance budget [ESTIMATES to be measured]

Totals MUST be measured and reported (actual values, never assumed): total JavaScript <= ~250 KB gzip (ESTIMATE, includes three), poster <= 60 KB, draw calls <= 2, instances <= 12,000, CLS ~ 0 (<= 0.01) on both desktop and mobile viewports, and zero GPU frames while offscreen or hidden. FPS targets (>= 55 fps desktop, >= 30 fps modest mobile) SHOULD be measured; where no device or browser automation is available, the item MUST be reported as pending, not passed.

#### Scenario: Bundle size report
- GIVEN the production build
- WHEN gzip sizes of all JS chunks are summed
- THEN the total is reported, and exceeding ~250 KB is flagged as a budget breach for design review

#### Scenario: CLS
- GIVEN the page loaded and scrolled through
- WHEN layout shift is measured
- THEN CLS is <= 0.01 (poster->canvas swap and font load included)

#### Scenario: Unverifiable device checks
- GIVEN no physical iOS/Android device or browser automation is available
- WHEN verification runs
- THEN mobile FPS and iOS behavior are recorded as "pending/unverified"
