# Skull Motion Specification

> Change: `voxel-skull-landing` · New capability.
> Sources: `docs/02-analisis-guion.md` §5 (F0-F3), `docs/03-analisis-motionsites.md` §2.1, M1 (hybrid).
> Legend: **[APPROVED]** user-approved (including the stated numbers). **[DEFAULT-PENDING]** values not given in docs 01-03; proposed tunables that MUST be confirmed at spec review. They MUST live as named constants so they can be changed without altering behavior contracts.

## Purpose

Define the motion of the skull in Block A: intro rotation, ambient rotation with positional drift, additive scroll scrub with frame-rate-independent smoothing, reversibility, pause/resume and reduced motion. Motion model (M1, approved hybrid): intro and ambient run automatically; scroll ADDS rotation and offset while Block A exits the viewport. If the user never scrolls, the script is fulfilled anyway.

## Requirements

### Requirement: Composed yaw model [APPROVED structure]

The skull yaw MUST be computed as `yaw = intro(t) + ambient(t) + scrub(s)` where `t` is the elapsed active animation time and `s` is the smoothed scroll progress. The position offset MUST be `drift(t) + scrubOffset(s)`. Rotation MUST be around the vertical (Y) axis only. All three terms MUST be pure functions of their inputs (no hidden state) so they can be unit-tested.

#### Scenario: Pure composition
- GIVEN fixed inputs t = 1.5 s and s = 0.4
- WHEN the composition function is evaluated twice
- THEN both results are identical and equal to the sum of the three term functions evaluated at those inputs

### Requirement: Intro rotation [APPROVED, numbers confirmed by user 2026-10-26]

On first reveal the skull MUST rotate about Y with ease-in-out (acceleration and deceleration, no linear section), settling at the static 3/4 pose. Proposed defaults: duration 2800 ms; total sweep 360 degrees ending at the 3/4 pose yaw of -30 degrees (flipped by user 2026-10-27 so the face turns toward the lateral light; matches the approved checkpoint image); easing cubic in-out. `intro(0)` MUST equal the start pose, `intro(duration)` MUST equal the final pose, and the function MUST be monotonic and constant after the duration.

#### Scenario: Endpoints and monotonicity
- GIVEN the intro function with its constants
- WHEN evaluated at t = 0, at the duration, and at 100 sample points between
- THEN the endpoints equal start and final pose, samples are non-decreasing, and values for t > duration equal the final pose

#### Scenario: Ease-in-out shape
- GIVEN the intro function
- WHEN angular velocity is sampled at 5%, 50% and 95% of the duration
- THEN velocity at 50% is greater than at 5% and at 95%, and velocity at both t = 0 and t = duration is approximately zero

#### Scenario: Plays without scrolling
- GIVEN the page loaded and no scroll input occurs
- WHEN the intro duration elapses
- THEN the skull has reached the 3/4 pose from the intro alone

### Requirement: Ambient rotation and drift [APPROVED, numbers confirmed by user 2026-10-26]

After the intro the skull MUST rotate slowly and continuously about Y, and MUST drift slightly in position to reinforce depth. The ambient velocity MUST ramp up from 0 so there is no velocity jump when the intro ends. Proposed defaults: ambient speed 6 degrees/second reached via a 1000 ms linear ramp; drift as sinusoids of ±2% of the viewport height on Y and ±1.5% on X, with periods of 9 s and 13 s. The ambient term MUST NOT interfere with scroll scrub.

#### Scenario: Continuity at the intro-ambient handoff
- GIVEN the intro ends at time T
- WHEN yaw is sampled at T - 1 frame, T, and T + 1 frame (16.67 ms)
- THEN the absolute yaw difference between consecutive samples never exceeds the maximum per-frame delta of the intro and no discontinuity is observed (|yaw(T+) - yaw(T-)| <= max per-frame step)

#### Scenario: Drift bounds
- GIVEN the drift function sampled over 60 s
- WHEN min and max offsets are read
- THEN the Y offset stays within ±2% and X within ±1.5% of the viewport height

### Requirement: Scroll progress mapping [APPROVED]

Scroll progress MUST be `progress = clamp(scrollY / blockAHeight, 0, 1)` where `blockAHeight` is the rendered height of Block A (100svh). The mapping MUST be a deterministic function of scroll position: the same scrollY always yields the same target progress, regardless of scroll direction or history.

#### Scenario: Mapping values
- GIVEN blockAHeight of 800 px
- WHEN scrollY is -20, 0, 400, 800 and 1600
- THEN progress is 0, 0, 0.5, 1 and 1 respectively

### Requirement: Dt-corrected smoothing [APPROVED 0.12; correction per exploration]

Smoothed progress MUST follow `s += (target - s) * alpha` with `alpha = 1 - (1 - 0.12)^(dt * 60)` where `dt` is the elapsed seconds since the previous tick. At dt = 1/60 s, alpha MUST equal 0.12. Smoothing MUST converge to the target without oscillation or overshoot and MUST be frame-rate independent: advancing 1 second of simulated time in 60 ticks of 1/60 s and in 30 ticks of 1/30 s MUST produce the same `s` within 1e-6. `dt` MUST be clamped to a maximum (default 100 ms) to avoid a jump after a long frame or tab resume.

#### Scenario: Alpha at 60 fps
- GIVEN dt = 1/60
- WHEN alpha is computed
- THEN alpha equals 0.12 within 1e-9

#### Scenario: Frame-rate independence
- GIVEN s = 0 and target = 1
- WHEN simulating 1 s as 60 ticks of 1/60 s and, separately, as 30 ticks of 1/30 s
- THEN both final values of s differ by <= 1e-6

#### Scenario: No overshoot
- GIVEN any target in [0, 1], any starting s in [0, 1] and any dt > 0
- WHEN a tick is applied
- THEN the new s lies between the old s and the target (inclusive)

#### Scenario: dt clamp
- GIVEN dt = 2 s (resumed tab)
- WHEN a tick is applied
- THEN the effective dt is the clamp maximum

### Requirement: Additive scrub [APPROVED, magnitudes confirmed by user 2026-10-26]

The scrub term MUST add rotation and offset on top of the intro/ambient terms, never replacing or cutting them. Proposed defaults: `scrub(s)` = 180 degrees * s of additional yaw; `scrubOffset(s)` = upward offset of 15% of the viewport height * s. `scrub(0)` MUST be 0 and `scrubOffset(0)` MUST be 0, so at scrollY = 0 behavior equals unscrolled behavior. Block A itself leaves the viewport through native scrolling (no JS-driven translation of the block).

#### Scenario: Additivity
- GIVEN the ambient term at some t yields A and the scrub at s = 1 yields 180 degrees
- WHEN the composed yaw is computed
- THEN it equals intro(t) + A + 180 degrees (ambient is not zeroed by scrolling)

#### Scenario: Zero scroll equals unscrolled
- GIVEN s = 0
- WHEN yaw is computed at time t
- THEN yaw equals intro(t) + ambient(t) exactly

### Requirement: Reversibility [APPROVED]

Given identical t, scrolling down then back up to the same scrollY and letting smoothing settle MUST return the scrub contribution to exactly the same value as before. The scrub contribution MUST depend only on the settled target progress, never on the path taken.

#### Scenario: Round trip
- GIVEN settled s at scrollY = 300
- WHEN scrollY goes to 800 and back to 300 and smoothing settles (|s - target| < 1e-4)
- THEN scrub(s) equals the original value within 1e-4

#### Scenario: Fast scroll without jumps
- GIVEN the scroll jumps from 0 to blockAHeight in one frame
- WHEN smoothing advances over the next frames at 60 fps
- THEN per-frame change in s never exceeds alpha * 1 (no step greater than 12% of the full range) and the sequence is monotonic

### Requirement: Pause and resume preserve the timeline [APPROVED]

When rendering pauses (Block A offscreen or tab hidden, see `voxel-skull-scene`), the animation clock MUST NOT advance. On resume the intro MUST continue from where it stopped and MUST NOT restart; no time jump occurs. If the intro had already completed it MUST NOT replay.

#### Scenario: Intro not restarted
- GIVEN the intro is at 1200 ms and the tab becomes hidden for 10 s
- WHEN the tab becomes visible again
- THEN the next tick continues with t ~ 1200 ms + one clamped dt, not 11,200 ms and not 0

#### Scenario: Completed intro does not replay
- GIVEN the intro finished and Block A scrolled out then back into view
- WHEN rendering resumes
- THEN the skull is in ambient mode (no intro sweep)

### Requirement: Cross-fade timing [APPROVED]

The poster-to-canvas cross-fade MUST last 500 ms. The intro clock SHOULD start at the first rendered frame, so the intro is not partly consumed while the poster is displayed.

#### Scenario: Intro starts at first frame
- GIVEN the chunk loads 3 s after page load
- WHEN the first frame renders
- THEN intro time t is ~0 at that frame

### Requirement: Reduced motion [APPROVED]

When `prefers-reduced-motion: reduce` is active, the skull MUST render a single static frame at the 3/4 pose (yaw -30 degrees by default; flipped by user 2026-10-27 so the face turns toward the lateral light, matching the approved checkpoint image) with no intro, no ambient rotation, no drift and no scrub, and the animation loop MUST NOT run. The cross-fade MUST be replaced by an instant swap (or poster stays). If the preference changes at runtime, behavior MUST switch accordingly: to reduced, stop the loop and render one static frame; to normal, start the intro from the first frame.

#### Scenario: Static pose
- GIVEN reduced motion is active
- WHEN Block A is displayed and the user scrolls
- THEN the rendered yaw stays at the 3/4 pose and no animation frames are scheduled

#### Scenario: Runtime switch to reduced
- GIVEN the animation is in ambient mode
- WHEN the media query changes to `reduce`
- THEN the loop stops and one static frame at the 3/4 pose is rendered

#### Scenario: Runtime switch to normal
- GIVEN reduced motion was active
- WHEN the media query changes to `no-preference`
- THEN the intro starts and the ambient motion follows
