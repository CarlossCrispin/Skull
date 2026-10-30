import { describe, expect, it, vi } from 'vitest';
import { LOOK_MAX_PITCH_DEG, LOOK_MAX_YAW_DEG } from '../lib/motion/constants.js';
import { OPENING_DONE } from '../lib/motion/opening.js';
import { SkullScene } from './SkullScene.js';
import { FakeClock, FakeRenderer, ManualScheduler } from './testDoubles.js';

const RAD = Math.PI / 180;

function setup({ reducedMotion = false } = {}) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const scheduler = new ManualScheduler();
  const clock = new FakeClock();
  const renderers = [];
  const input = { attached: 0, detached: 0, push: null };
  const scene = new SkullScene({
    container,
    reducedMotion,
    readScrollFrame: () => ({ target: 0, opening: OPENING_DONE }),
    onReady: vi.fn(),
    onLost: vi.fn(),
    onFailure: vi.fn(),
    deps: {
      createRenderer: () => {
        const r = new FakeRenderer();
        renderers.push(r);
        return r;
      },
      scheduler,
      now: clock.now,
      devicePixelRatio: () => 1,
      patchMaterial: () => true,
      attachLookInput: (onLook) => {
        input.attached += 1;
        input.push = onLook;
        return () => {
          input.detached += 1;
        };
      },
    },
  });
  // Runs frames 16 ms apart until the loop idles; returns how many ran.
  const drain = (max = 600) => {
    let n = 0;
    while (scheduler.pendingCount > 0 && n < max) {
      clock.value += 16;
      scheduler.tick(clock.value);
      n += 1;
    }
    return n;
  };
  return { scene, scheduler, clock, renderers, input, drain };
}

describe('SkullScene pointer follow', () => {
  it('attaches the look input on start and detaches it on dispose', () => {
    const { scene, input } = setup();
    scene.start();
    expect(input.attached).toBe(1);
    scene.dispose();
    expect(input.detached).toBe(1);
  });

  it('attaches nothing under reduced motion and leaves the rotation at 0', () => {
    const { scene, input, scheduler } = setup({ reducedMotion: true });
    scene.start();
    expect(input.attached).toBe(0);
    expect(scheduler.pendingCount).toBe(0);
    expect(scene.stage.rotation.y).toBe(0);
    expect(scene.stage.rotation.x).toBe(0);
  });

  it('attaches when reduced motion turns off and detaches when it turns on', () => {
    const { scene, input } = setup({ reducedMotion: true });
    scene.start();
    scene.setReducedMotion(false);
    expect(input.attached).toBe(1);
    scene.setReducedMotion(true);
    expect(input.detached).toBe(1);
  });

  it('detaches while the tab is hidden and re-attaches on resume', () => {
    const { scene, input } = setup();
    scene.start();
    scene.setPaused('hidden', true);
    expect(input.detached).toBe(1);
    scene.setPaused('hidden', false);
    expect(input.attached).toBe(2);
  });

  it('wakes the loop and turns the whole stage toward the pointer, within the maxima', () => {
    const { scene, input, drain } = setup();
    scene.start();
    drain();
    input.push({ x: 1, y: 1 });
    expect(drain()).toBeGreaterThan(1);
    expect(scene.stage.rotation.y).toBeCloseTo(LOOK_MAX_YAW_DEG * RAD, 9);
    expect(scene.stage.rotation.x).toBeCloseTo(LOOK_MAX_PITCH_DEG * RAD, 9);
  });

  it('settles: after the offset is stable the loop idles and no frame renders', () => {
    const { scene, input, drain, renderers, scheduler } = setup();
    scene.start();
    drain();
    input.push({ x: -0.5, y: 0.5 });
    drain();
    const rendered = renderers[0].renders.length;
    expect(scheduler.pendingCount).toBe(0);
    scene.invalidate();
    drain();
    expect(renderers[0].renders.length).toBe(rendered);
  });

  it('eases back to 0 when the input recenters', () => {
    const { scene, input, drain } = setup();
    scene.start();
    drain();
    input.push({ x: 1, y: 1 });
    drain();
    input.push({ x: 0, y: 0 });
    drain();
    expect(scene.stage.rotation.y).toBe(0);
    expect(scene.stage.rotation.x).toBe(0);
  });

  it('resets the target when the input detaches so a stale pointer does not stick', () => {
    const { scene, input, drain } = setup();
    scene.start();
    drain();
    input.push({ x: 1, y: 1 });
    drain();
    scene.setPaused('hidden', true);
    scene.setPaused('hidden', false);
    drain();
    expect(scene.stage.rotation.y).toBe(0);
  });
});
