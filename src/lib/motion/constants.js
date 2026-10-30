/**
 * Named motion tunables for the skull (spec: skull-motion). Durations are in
 * seconds, angles in degrees, offsets in fractions of the viewport height.
 * User-approved 2026-10-26; change them here without touching the math.
 */

/**
 * 3/4 pose yaw: the assembled skull rests here and ambient rotation starts from
 * it; also used for reduced motion and the poster.
 * -30 turns the face toward the lateral key light (screen-left). Flipped by user
 * 2026-10-27 to match the approved checkpoint image (it was +30).
 */
export const FINAL_YAW_DEG = -30;

/** Steady ambient rotation speed. */
export const AMBIENT_SPEED_DEG_S = 6;
/** Linear ramp of the ambient speed from 0 to full. */
export const AMBIENT_RAMP_S = 1;

/** Drift amplitude on Y, fraction of the viewport height. */
export const DRIFT_Y_AMPLITUDE = 0.02;
/** Drift period on Y. */
export const DRIFT_Y_PERIOD_S = 9;
/** Drift amplitude on X, fraction of the viewport height. */
export const DRIFT_X_AMPLITUDE = 0.015;
/** Drift period on X. */
export const DRIFT_X_PERIOD_S = 13;

/** Per-frame smoothing factor at the reference frame rate. */
export const SMOOTH_BASE = 0.12;
/** Reference frame rate for the dt-corrected smoothing. */
export const REF_FPS = 60;
/** Maximum dt accepted by a tick (guards long frames and tab resume). */
export const MAX_DT_S = 0.1;

/** Reveal stagger step (Block B). */
export const REVEAL_STEP_MS = 120;

/**
 * Scroll-assembly tunables (spec: skull-motion). DEFAULT-PENDING until the
 * visual checkpoint; change them here without touching the math.
 */

/** Share of the progress range over which the per-cube start delays are spread. */
export const ASSEMBLY_STAGGER = 0.6;
/** Smoothed progress snaps to the target inside this distance (lets the loop idle). */
export const PROGRESS_SNAP = 1e-3;
/** Hysteresis: an assembled skull stays assembled while progress is at least this. */
export const ASSEMBLED_EXIT = 0.995;
/** Progress at which the wireframe lattice starts fading in. */
export const LATTICE_FADE_FROM = 0.8;

/**
 * Opening sequence (spec: skull-motion). Explode is APPROVED 2026-10-27; the zoom, hold,
 * start distance and maximum wait are DEFAULT-PENDING a visual check. The names avoid
 * `INTRO_*` on purpose: there is no intro sweep (see pose tests).
 */

/** Zoom entrance: the skull flies in from behind the viewer (ease-out), counted from ready. */
export const OPENING_ZOOM_S = 1.6;
/** Assembled hold counted from the end of the zoom, before the explosion. */
export const OPENING_HOLD_S = 0.8;
/** World z of the stage at the zoom start; the camera is at 120, so the skull starts behind it. */
export const OPENING_ZOOM_START_Z = 150;
/** Duration of the time-driven explosion (ease-out). */
export const OPENING_EXPLODE_S = 1.2;
/** Longest the empty waiting screen holds for the live scene before the opening is skipped. */
export const OPENING_MAX_WAIT_S = 4;
/** Canvas fade-in duration (mirrors the `skull-fade` animation). */
export const CANVAS_FADE_MS = 500;

/** Viewports of scroll over which the cubes gather in the assembly range (mirrors the CSS height; DEFAULT-PENDING). */
export const ASSEMBLY_RANGE_VIEWPORTS = 2;
