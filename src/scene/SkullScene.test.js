import {
  AmbientLight,
  DirectionalLight,
  InstancedMesh,
  Light,
  PerspectiveCamera,
} from 'three';
import { describe, expect, it, vi } from 'vitest';
import { latticeOpacity } from '../lib/motion/assembly.js';
import { MAX_DT_S } from '../lib/motion/constants.js';
import { easeOutCubic } from '../lib/motion/easing.js';
import { OPENING_DONE } from '../lib/motion/opening.js';
import { composePose, staticPose } from '../lib/motion/pose.js';
import { deriveFovDegrees, worldUnitsPerViewportHeight } from './framing.js';
import { SkullScene } from './SkullScene.js';
import { FakeClock, FakeRenderer, ManualScheduler } from './testDoubles.js';

function setup(overrides = {}, dpr = 1) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const scheduler = new ManualScheduler();
  const clock = new FakeClock();
  const renderers = [];
  const frame = { target: 0, opening: undefined };
  const captured = { uniforms: null };
  const callbacks = {
    onReady: vi.fn(),
    onLost: vi.fn(),
    onFailure: vi.fn(),
    readScrollFrame: vi.fn(
      () => ({
        target: frame.target,
        ...(frame.opening === undefined ? {} : { opening: frame.opening }),
      }),
    ),
  };
  const { deps, ...rest } = overrides;
  const scene = new SkullScene({
    container,
    reducedMotion: false,
    ...callbacks,
    ...rest,
    deps: {
      createRenderer: () => {
        const r = new FakeRenderer();
        renderers.push(r);
        return r;
      },
      scheduler,
      now: clock.now,
      devicePixelRatio: () => dpr,
      patchMaterial: (_material, _atlas, uniforms) => {
        captured.uniforms = uniforms;
        return true;
      },
      ...deps,
    },
  });
  return {
    container,
    scheduler,
    clock,
    renderers,
    callbacks,
    scene,
    frame,
    uniforms: () => captured.uniforms,
  };
}

function collect(root, predicate) {
  const found = [];
  root.traverse((o) => {
    if (predicate(o)) {
      found.push(o);
    }
  });
  return found;
}

function firstScene(renderer) {
  return renderer.renders[0].scene;
}

describe('SkullScene construction', () => {
  it('builds exactly one directional and one ambient light, with no shadow casting', () => {
    const { scene, scheduler, renderers } = setup();
    scene.start();
    scheduler.tick(0);
    const root = firstScene(renderers[0]);
    const lights = collect(root, (o) => o instanceof Light);
    expect(lights.filter((l) => l instanceof DirectionalLight)).toHaveLength(1);
    expect(lights.filter((l) => l instanceof AmbientLight)).toHaveLength(1);
    expect(lights).toHaveLength(2);
    expect(lights.every((l) => !l.castShadow)).toBe(true);
    expect(collect(root, (o) => o instanceof InstancedMesh)).toHaveLength(1);
  });

  it('appends the renderer canvas to the container', () => {
    const { container, renderers } = setup();
    expect(container.contains(renderers[0].domElement)).toBe(true);
  });

  it('keeps the lattice out of the rotating skull group and honors the lattice option', () => {
    const on = setup();
    on.scene.start();
    on.scheduler.tick(0);
    const root = firstScene(on.renderers[0]);
    const mesh = collect(root, (o) => o instanceof InstancedMesh)[0];
    const lines = collect(root, (o) => o.type === 'LineSegments');
    expect(lines).toHaveLength(1);
    expect(mesh.parent).not.toBe(lines[0]);

    const off = setup({ lattice: false });
    off.scene.start();
    off.scheduler.tick(0);
    expect(collect(firstScene(off.renderers[0]), (o) => o.type === 'LineSegments')).toHaveLength(0);
  });

  it('reports onFailure("patch"), never renders and disposes when the patch is declined', () => {
    const patchMaterial = vi.fn(() => false);
    const { scene, scheduler, renderers, callbacks } = setup({ deps: { patchMaterial } });
    expect(patchMaterial).toHaveBeenCalledTimes(1);
    expect(callbacks.onFailure).toHaveBeenCalledExactlyOnceWith('patch');
    expect(() => {
      scene.start();
      scheduler.tick(0);
      scene.resize(300, 200);
      scene.setPaused('hidden', false);
    }).not.toThrow();
    expect(renderers[0].renders).toHaveLength(0);
    expect(renderers[0].disposed).toBe(1);
    expect(renderers[0].contextLosses).toBe(1);
    expect(scheduler.pendingCount).toBe(0);
    expect(callbacks.onReady).not.toHaveBeenCalled();
  });

  it('does not report a patch failure when the patcher accepts the shader', () => {
    const { callbacks } = setup();
    expect(callbacks.onFailure).not.toHaveBeenCalled();
  });

  it('reports onFailure("renderer") without propagating when the factory throws', () => {
    const onFailure = vi.fn();
    expect(() =>
      setup({
        onFailure,
        deps: {
          createRenderer: () => {
            throw new Error('no webgl');
          },
          scheduler: new ManualScheduler(),
        },
      }),
    ).not.toThrow();
    expect(onFailure).toHaveBeenCalledExactlyOnceWith('renderer');
  });

  it('is inert after a renderer failure', () => {
    const scheduler = new ManualScheduler();
    const { scene } = setup({
      deps: {
        createRenderer: () => {
          throw new Error('no webgl');
        },
        scheduler,
      },
    });
    expect(() => {
      scene.start();
      scene.setPaused('hidden', false);
      scene.setReducedMotion(true);
      scene.resize(100, 100);
      scene.dispose();
    }).not.toThrow();
    expect(scheduler.requested).toBe(0);
  });

  it('caps the pixel ratio at 2 (3 -> 2, 1.5 -> 1.5)', () => {
    expect(setup({}, 3).renderers[0].pixelRatio).toBe(2);
    expect(setup({}, 1.5).renderers[0].pixelRatio).toBe(1.5);
  });

  it('caps the pixel ratio at 1.5 on touch-only devices (3 -> 1.5, 1 -> 1)', () => {
    expect(setup({ deps: { touchOnly: () => true } }, 3).renderers[0].pixelRatio).toBe(1.5);
    expect(setup({ deps: { touchOnly: () => true } }, 1).renderers[0].pixelRatio).toBe(1);
    expect(setup({ deps: { touchOnly: () => false } }, 3).renderers[0].pixelRatio).toBe(2);
  });

  it('resize updates setSize(w, h, false), pixel ratio and the camera aspect/FOV', () => {
    const { scene, scheduler, renderers } = setup();
    scene.start();
    scene.resize(1440, 900);
    scene.resize(390, 844);
    scheduler.tick(0);
    const r = renderers[0];
    expect(r.sizes.at(-2)).toEqual([1440, 900, false]);
    expect(r.sizes.at(-1)).toEqual([390, 844, false]);
    const camera = r.renders[0].camera;
    expect(camera.aspect).toBeCloseTo(390 / 844, 9);
    expect(camera.fov).toBeCloseTo(deriveFovDegrees(390, 844), 9);
  });

  it('does not animate individual instances between frames', () => {
    const { scene, scheduler, renderers } = setup();
    scene.start();
    scheduler.tick(0);
    const mesh = collect(firstScene(renderers[0]), (o) => o instanceof InstancedMesh)[0];
    const before = Float32Array.from(mesh.instanceMatrix.array);
    const version = mesh.instanceMatrix.version;
    scheduler.tick(16);
    scheduler.tick(32);
    expect(Array.from(mesh.instanceMatrix.array)).toEqual(Array.from(before));
    expect(mesh.instanceMatrix.version).toBe(version);
  });
});

function groupOf(renderer) {
  const mesh = collect(firstScene(renderer), (o) => o instanceof InstancedMesh)[0];
  return mesh.parent;
}

describe('SkullScene motion and pause', () => {
  it('renders the first frame at t = 0 even when the chunk loads 3 s late', () => {
    const { scene, scheduler, clock, renderers, callbacks } = setup();
    clock.value = 3000;
    scene.start();
    scheduler.tick(3000);
    const r = renderers[0];
    expect(r.renders).toHaveLength(1);
    const group = groupOf(r);
    // Scattered at the first frame: the pose is the 3/4 pose at scale 1.
    expect(group.rotation.y).toBeCloseTo(staticPose().yaw, 9);
    expect(group.rotation.y).toBeCloseTo((-30 * Math.PI) / 180, 9);
    expect(group.scale.x).toBe(1);
    expect(callbacks.onReady).toHaveBeenCalledTimes(1);
  });

  it('renders nothing and keeps no pending frame after a hidden pause', () => {
    const { scene, scheduler, renderers, frame } = setup();
    frame.target = 1;
    scene.start();
    scheduler.tick(0);
    scheduler.tick(16);
    scene.setPaused('hidden', true);
    expect(scheduler.pendingCount).toBe(0);
    const count = renderers[0].renders.length;
    expect(scheduler.tick(32)).toBe(false);
    expect(renderers[0].renders).toHaveLength(count);
  });

  it('does not render when paused before start; the first frame happens on first visibility', () => {
    const { scene, scheduler, clock, renderers } = setup();
    scene.setPaused('hidden', true);
    scene.start();
    expect(scheduler.requested).toBe(0);
    clock.value = 5000;
    scene.setPaused('hidden', false);
    scheduler.tick(5000);
    expect(renderers[0].renders).toHaveLength(1);
    expect(groupOf(renderers[0]).rotation.y).toBeCloseTo(staticPose().yaw, 9);
  });

  it('resumes the rotation clock after a hidden pause without restarting it', () => {
    const { scene, scheduler, clock, renderers, frame } = setup();
    frame.target = 1;
    scene.start();
    scheduler.tick(0);
    for (let ms = 100; ms <= 1000; ms += 100) {
      scheduler.tick(ms);
    }
    const group = groupOf(renderers[0]);
    const before = group.rotation.y;
    scene.setPaused('hidden', true);
    clock.value = 11_000;
    scene.setPaused('hidden', false);
    scheduler.tick(11_016);
    const restart = staticPose().yaw;
    expect(before).toBeGreaterThan(restart);
    expect(Math.abs(group.rotation.y - before)).toBeLessThan(Math.abs(before - restart));
    expect(group.rotation.y).toBeGreaterThan(before);
  });
});

describe('SkullScene assembly wiring', () => {
  it('snaps uProgress to the target on the first frame (no animated gather after a restored reload)', () => {
    const { scene, scheduler, uniforms, frame } = setup();
    frame.target = 0.6;
    scene.start();
    scheduler.tick(0);
    expect(uniforms().uProgress.value).toBe(0.6);
  });

  it('follows the target through smoothing and lands exactly on it, then idles', () => {
    const { scene, scheduler, uniforms, renderers, frame } = setup();
    scene.start();
    scheduler.tick(0);
    expect(uniforms().uProgress.value).toBe(0);
    frame.target = 0.5;
    scene.invalidate();
    scheduler.tick(16);
    expect(uniforms().uProgress.value).toBeGreaterThan(0);
    expect(uniforms().uProgress.value).toBeLessThan(0.5);
    let ms = 16;
    while (scheduler.pendingCount > 0 && ms < 20_000) {
      ms += 16;
      scheduler.tick(ms);
    }
    expect(uniforms().uProgress.value).toBe(0.5);
    expect(scheduler.pendingCount).toBe(0);
    const count = renderers[0].renders.length;
    expect(scheduler.tick(ms + 16)).toBe(false);
    expect(renderers[0].renders).toHaveLength(count);
  });

  it('idles when settled below 1; a wake runs one frame that renders nothing (identical frame)', () => {
    const { scene, scheduler, renderers, clock } = setup();
    scene.start();
    scheduler.tick(0);
    expect(scheduler.pendingCount).toBe(0);
    expect(renderers[0].renders).toHaveLength(1);
    clock.value = 4000;
    scene.invalidate();
    scene.invalidate();
    expect(scheduler.pendingCount).toBe(1);
    scheduler.tick(4016);
    expect(renderers[0].renders).toHaveLength(1);
    expect(scheduler.pendingCount).toBe(0);
  });

  it('keeps rendering continuously while assembled', () => {
    const { scene, scheduler, renderers, frame } = setup();
    frame.target = 1;
    scene.start();
    for (let i = 0; i < 20; i++) {
      scheduler.tick(i * 16);
      expect(scheduler.pendingCount).toBe(1);
    }
    expect(renderers[0].renders).toHaveLength(20);
  });

  it('ignores invalidate() after dispose and while hidden', () => {
    const { scene, scheduler } = setup();
    scene.start();
    scheduler.tick(0);
    scene.setPaused('hidden', true);
    scene.invalidate();
    expect(scheduler.pendingCount).toBe(0);
    scene.setPaused('hidden', false);
    scheduler.tick(16);
    scene.dispose();
    scene.invalidate();
    expect(scheduler.pendingCount).toBe(0);
  });

  it('never starts the rotation clock on the first rendered frame, even when already assembled', () => {
    const { scene, scheduler, renderers, frame } = setup();
    frame.target = 1;
    scene.start();
    scheduler.tick(0);
    const group = groupOf(renderers[0]);
    expect(group.rotation.y).toBeCloseTo(staticPose().yaw, 9);
    scheduler.tick(100);
    scheduler.tick(200);
    expect(group.rotation.y).toBeGreaterThan(staticPose().yaw);
  });

  it('holds yaw -30 deg while scattered and assembling, then ambient starts from it and freezes on scroll-up', () => {
    const { scene, scheduler, renderers, uniforms, frame } = setup();
    scene.start();
    scheduler.tick(0);
    const group = groupOf(renderers[0]);
    let ms = 0;
    const run = (frames) => {
      for (let i = 0; i < frames; i++) {
        ms += 16;
        scheduler.tick(ms);
      }
    };
    // Gathering from 0 to 1: the clock stays stopped until assembled.
    frame.target = 1;
    scene.invalidate();
    while (uniforms().uProgress.value < 1 && ms < 20_000) {
      run(1);
      if (uniforms().uProgress.value < 1) {
        expect(group.rotation.y).toBeCloseTo(staticPose().yaw, 9);
      }
    }
    expect(uniforms().uProgress.value).toBe(1);
    run(30);
    const spun = group.rotation.y;
    expect(spun).toBeGreaterThan(staticPose().yaw);
    // Scroll up: progress drops below 0.995, rotation freezes at the same value.
    frame.target = 0.2;
    run(1);
    const frozen = group.rotation.y;
    expect(uniforms().uProgress.value).toBeLessThan(0.995);
    run(20);
    expect(group.rotation.y).toBe(frozen);
    expect(frozen).toBeGreaterThanOrEqual(spun);
    // Reassemble: resumes from the frozen value, not from the start.
    frame.target = 1;
    scene.invalidate();
    while (uniforms().uProgress.value < 1 && ms < 40_000) {
      run(1);
    }
    run(10);
    expect(group.rotation.y).toBeGreaterThan(frozen);
    expect(group.rotation.y - frozen).toBeLessThan(frozen - staticPose().yaw);
  });

  it('advances the rotation clock by the clamped dt only (a 5 s gap counts as MAX_DT_S)', () => {
    const { scene, scheduler, renderers, frame } = setup();
    frame.target = 1;
    scene.start();
    scheduler.tick(0);
    scheduler.tick(5000);
    expect(groupOf(renderers[0]).rotation.y).toBeCloseTo(composePose(MAX_DT_S).yaw, 12);
  });

  it('does not touch the instance matrices across frames', () => {
    const { scene, scheduler, renderers, frame } = setup();
    frame.target = 1;
    scene.start();
    scheduler.tick(0);
    const mesh = collect(firstScene(renderers[0]), (o) => o instanceof InstancedMesh)[0];
    const version = mesh.instanceMatrix.version;
    scheduler.tick(16);
    scheduler.tick(32);
    expect(mesh.instanceMatrix.version).toBe(version);
  });
});

describe('SkullScene opening composition', () => {
  const HOLD = { phase: 'hold', zoom: 1, explode: 0 };
  const WAITING = { phase: 'waiting', zoom: 0, explode: 0 };
  const zooming = (x) => ({ phase: 'zoom', zoom: easeOutCubic(x), explode: 0 });
  const exploding = (x) => {
    const explode = easeOutCubic(x);
    return { phase: 'exploding', zoom: 1, explode };
  };
  const stageOf = (renderer) => groupOf(renderer).parent;
  it('renders exactly one assembled frame during the hold, then idles', () => {
    const { scene, scheduler, renderers, uniforms, frame } = setup();
    frame.opening = HOLD;
    frame.target = 0;
    scene.start();
    scene.resize(1440, 900);
    scheduler.tick(0);
    expect(uniforms().uProgress.value).toBe(1);
    expect(renderers[0].renders).toHaveLength(1);
    expect(scheduler.pendingCount).toBe(0);
    expect(scheduler.tick(16)).toBe(false);
    expect(scheduler.tick(32)).toBe(false);
    expect(renderers[0].renders).toHaveLength(1);
  });

  it('renders every tick while exploding, follows lerp(1, target, explode) and settles then idles', () => {
    const { scene, scheduler, renderers, uniforms, frame } = setup();
    frame.opening = HOLD;
    frame.target = 0.2;
    scene.start();
    scene.resize(1440, 900);
    scheduler.tick(0);
    expect(renderers[0].renders).toHaveLength(1);
    const frames = 72;
    let ms = 0;
    for (let i = 1; i <= frames; i += 1) {
      frame.opening = exploding(i / frames);
      if (i === 1) {
        scene.invalidate();
      }
      expect(scheduler.pendingCount).toBe(1);
      ms += 16;
      scheduler.tick(ms);
      const sample = frame.opening;
      expect(uniforms().uProgress.value).toBeCloseTo(1 - 0.8 * sample.explode, 12);
    }
    expect(renderers[0].renders).toHaveLength(1 + frames);
    expect(uniforms().uProgress.value).toBeCloseTo(0.2, 12);
    // The opening is done: the next frame settles at the target and the loop idles.
    frame.opening = OPENING_DONE;
    ms += 16;
    scheduler.tick(ms);
    expect(uniforms().uProgress.value).toBeCloseTo(0.2, 12);
    expect(scheduler.pendingCount).toBe(0);
    expect(renderers[0].renders).toHaveLength(2 + frames);
  });

  it('puts the yaw group and the lattice under one stage group, not directly under the scene', () => {
    const { scene, scheduler, renderers } = setup();
    scene.start();
    scheduler.tick(0);
    const root = firstScene(renderers[0]);
    const lines = collect(root, (o) => o.type === 'LineSegments')[0];
    const stage = stageOf(renderers[0]);
    expect(stage).not.toBe(root);
    expect(stage.parent).toBe(root);
    expect(lines.parent).toBe(stage);
    expect(groupOf(renderers[0]).parent).toBe(stage);
  });

  it('presents one empty frame in waiting (stage at z 150, behind the camera) then idles', () => {
    const { scene, scheduler, renderers, frame, callbacks } = setup();
    frame.opening = WAITING;
    scene.start();
    scheduler.tick(0);
    expect(renderers[0].renders).toHaveLength(1);
    expect(callbacks.onReady).toHaveBeenCalledTimes(1);
    expect(stageOf(renderers[0]).position.z).toBe(150);
    expect(scheduler.pendingCount).toBe(0);
    scene.invalidate();
    scheduler.tick(16);
    expect(renderers[0].renders).toHaveLength(1);
  });

  it('follows zoomStageZ(zoom) on every zoom tick and settles the stage at z 0', () => {
    const { scene, scheduler, renderers, frame } = setup();
    frame.opening = WAITING;
    scene.start();
    scheduler.tick(0);
    const stage = stageOf(renderers[0]);
    const steps = 10;
    for (let i = 1; i <= steps; i += 1) {
      frame.opening = zooming(i / steps);
      if (i === 1) {
        scene.invalidate();
      }
      expect(scheduler.pendingCount).toBe(1);
      scheduler.tick(i * 16);
      expect(stage.position.z).toBeCloseTo(150 * (1 - easeOutCubic(i / steps)), 12);
    }
    expect(renderers[0].renders).toHaveLength(1 + steps);
    expect(stage.position.z).toBe(0);
    // The hold renders its settled frame once (zoom 1 is a new key) and then idles.
    frame.opening = HOLD;
    scheduler.tick(300);
    expect(renderers[0].renders).toHaveLength(1 + steps);
    expect(scheduler.pendingCount).toBe(0);
  });

  it('keeps the assembled frame identical to the previous pipeline at zoom 1 (progress 1, stage at 0)', () => {
    const { scene, scheduler, renderers, uniforms, frame } = setup();
    frame.opening = HOLD;
    frame.target = 0;
    scene.start();
    scheduler.tick(0);
    expect(stageOf(renderers[0]).position.z).toBe(0);
    expect(uniforms().uProgress.value).toBe(1);
    expect(groupOf(renderers[0]).rotation.y).toBeCloseTo(staticPose().yaw, 12);
  });

  it('includes zoom in the frame key: a zoom change alone renders, an identical zoom does not', () => {
    const { scene, scheduler, renderers, frame } = setup();
    frame.opening = zooming(0.2);
    scene.start();
    scheduler.tick(0);
    frame.opening = zooming(0.4);
    scene.invalidate();
    scheduler.tick(16);
    expect(renderers[0].renders).toHaveLength(2);
    // Same zoom, same everything else: nothing to render although the phase wants frames.
    scheduler.tick(32);
    expect(renderers[0].renders).toHaveLength(2);
  });

  it('starts the explosion on a scroll mid-zoom while zoom frames continue', () => {
    const { scene, scheduler, renderers, uniforms, frame } = setup();
    frame.opening = WAITING;
    frame.target = 0;
    scene.start();
    scheduler.tick(0);
    const stage = stageOf(renderers[0]);
    frame.opening = zooming(0.3);
    scene.invalidate();
    scheduler.tick(16);
    const zoomAtScroll = zooming(0.3).zoom;
    expect(stage.position.z).toBeCloseTo(150 * (1 - zoomAtScroll), 12);
    // A scroll starts the explosion; the zoom value keeps following its own time curve.
    frame.opening = { phase: 'exploding', zoom: 0.6, explode: 0.5 };
    scheduler.tick(32);
    expect(uniforms().uProgress.value).toBeCloseTo(0.5, 12);
    expect(stage.position.z).toBeCloseTo(150 * (1 - 0.6), 12);
    // The explosion is over but the zoom is still below 1: frames continue until it lands.
    frame.opening = { phase: 'done', zoom: 0.8, explode: 1 };
    scheduler.tick(48);
    expect(stage.position.z).toBeCloseTo(150 * 0.2, 12);
    expect(scheduler.pendingCount).toBe(1);
    frame.opening = OPENING_DONE;
    // Progress still smooths from the explosion's 0.5 down to the target: settle until idle.
    for (let ms = 64; scheduler.pendingCount > 0 && ms < 5000; ms += 16) {
      scheduler.tick(ms);
    }
    expect(stage.position.z).toBe(0);
    expect(uniforms().uProgress.value).toBe(0);
    expect(scheduler.pendingCount).toBe(0);
  });

  it('keeps the rotation clock at 0 and the instance matrices untouched through the opening', () => {
    const { scene, scheduler, renderers, frame } = setup();
    frame.opening = HOLD;
    frame.target = 1;
    scene.start();
    scheduler.tick(0);
    const mesh = collect(firstScene(renderers[0]), (o) => o instanceof InstancedMesh)[0];
    const version = mesh.instanceMatrix.version;
    scene.invalidate();
    for (let i = 1; i <= 10; i += 1) {
      frame.opening = exploding(i / 10);
      scheduler.tick(i * 16);
      expect(groupOf(renderers[0]).rotation.y).toBeCloseTo(staticPose().yaw, 12);
    }
    expect(mesh.instanceMatrix.version).toBe(version);
  });
});

describe('SkullScene lattice fade', () => {
  function draws(renderer) {
    return collect(
      firstScene(renderer),
      (o) => o.visible && (o instanceof InstancedMesh || o.type === 'LineSegments'),
    ).length;
  }
  function lattice(renderer) {
    return collect(firstScene(renderer), (o) => o.type === 'LineSegments')[0];
  }

  it('hides the lattice and issues one draw while scattered', () => {
    const { scene, scheduler, renderers } = setup();
    scene.start();
    scheduler.tick(0);
    expect(lattice(renderers[0]).visible).toBe(false);
    expect(draws(renderers[0])).toBe(1);
  });

  it('fades the lattice with latticeOpacity(p) between 0.8 and 1', () => {
    const { scene, scheduler, renderers, frame } = setup();
    frame.target = 0.9;
    scene.start();
    scheduler.tick(0);
    const line = lattice(renderers[0]);
    expect(latticeOpacity(0.9)).toBeGreaterThan(0);
    expect(latticeOpacity(0.9)).toBeLessThan(1);
    expect(line.material.opacity).toBeCloseTo(latticeOpacity(0.9), 12);
    expect(line.visible).toBe(true);
    expect(draws(renderers[0])).toBe(2);
  });

  it('is exactly opaque with two draws when assembled, and hidden again when re-scattered', () => {
    const { scene, scheduler, renderers, frame } = setup();
    frame.target = 1;
    scene.start();
    scheduler.tick(0);
    const line = lattice(renderers[0]);
    expect(line.material.opacity).toBe(1);
    expect(draws(renderers[0])).toBe(2);
    frame.target = 0;
    let ms = 0;
    while (ms < 20_000) {
      ms += 16;
      if (!scheduler.tick(ms)) break;
    }
    expect(line.visible).toBe(false);
    expect(draws(renderers[0])).toBe(1);
  });
});

describe('SkullScene layout and resize', () => {
  it('writes no dim or avoid uniforms and never touches the scatter scale from a column', () => {
    const { scene, scheduler, uniforms } = setup();
    scene.start();
    scene.resize(1440, 900);
    scheduler.tick(0);
    expect(Object.keys(uniforms()).sort()).toEqual(['uMute', 'uMuteColor', 'uProgress', 'uScatterScale', 'uStagger']);
    const mute = uniforms().uMute.value.clone();
    scene.resize(390, 844);
    scheduler.tick(16);
    expect(uniforms().uMute.value.equals(mute)).toBe(true);
    expect(uniforms().uScatterScale.value.x).toBeCloseTo((worldUnitsPerViewportHeight(390, 844) / 2) * (390 / 844), 9);
  });

  it('resizes with setSize(w, h, false) and updates the camera and uScatterScale from the framing', () => {
    const { scene, scheduler, renderers, uniforms } = setup();
    scene.start();
    scene.resize(1440, 900);
    expect(scheduler.pendingCount).toBe(1);
    scheduler.tick(0);
    const half1440 = worldUnitsPerViewportHeight(1440, 900) / 2;
    expect(uniforms().uScatterScale.value.y).toBeCloseTo(half1440, 9);
    expect(uniforms().uScatterScale.value.x).toBeCloseTo((half1440 * 1440) / 900, 9);
    scene.resize(390, 844);
    scheduler.tick(16);
    const half390 = worldUnitsPerViewportHeight(390, 844) / 2;
    expect(uniforms().uScatterScale.value.y).toBeCloseTo(half390, 9);
    expect(uniforms().uScatterScale.value.x).toBeCloseTo((half390 * 390) / 844, 9);
    expect(half390).not.toBeCloseTo(half1440, 3);
    expect(renderers[0].sizes.at(-1)).toEqual([390, 844, false]);
  });

  it('ignores a height-only change below the tolerance (URL bar) but accepts a large one', () => {
    const { scene, scheduler, renderers } = setup();
    scene.start();
    scene.resize(1440, 900);
    scheduler.tick(0);
    const sizes = renderers[0].sizes.length;
    scene.resize(1440, 800);
    expect(renderers[0].sizes).toHaveLength(sizes);
    expect(scheduler.pendingCount).toBe(0);
    scene.resize(1440, 700);
    expect(renderers[0].sizes.at(-1)).toEqual([1440, 700, false]);
    expect(scheduler.pendingCount).toBe(1);
  });

  it('under reduced motion renders nothing, schedules no frame and never reads the scroll frame', () => {
    const { scene, scheduler, renderers, callbacks } = setup({ reducedMotion: true });
    scene.start();
    scene.resize(800, 600);
    scene.invalidate();
    expect(scheduler.requested).toBe(0);
    expect(renderers[0].renders).toHaveLength(0);
    expect(callbacks.readScrollFrame).not.toHaveBeenCalled();
    expect(callbacks.onReady).not.toHaveBeenCalled();
  });

  it('switching normal -> reduce stops the loop without an extra frame', () => {
    const { scene, scheduler, renderers, frame } = setup();
    frame.target = 1;
    scene.start();
    scheduler.tick(0);
    scheduler.tick(16);
    const before = renderers[0].renders.length;
    scene.setReducedMotion(true);
    expect(scheduler.pendingCount).toBe(0);
    expect(renderers[0].renders).toHaveLength(before);
    scene.setReducedMotion(true);
    expect(renderers[0].renders).toHaveLength(before);
  });

  it('switching reduce -> normal renders at the current target and continues the assembly state', () => {
    const { scene, scheduler, clock, renderers, uniforms, frame } = setup({ reducedMotion: true });
    frame.target = 1;
    scene.start();
    clock.value = 9000;
    scene.setReducedMotion(false);
    expect(scheduler.pendingCount).toBe(1);
    scheduler.tick(9000);
    expect(uniforms().uProgress.value).toBe(1);
    const group = groupOf(renderers[0]);
    expect(group.rotation.y).toBeCloseTo(staticPose().yaw, 9);
    scheduler.tick(9100);
    scheduler.tick(9200);
    const spun = group.rotation.y;
    expect(spun).toBeGreaterThan(staticPose().yaw);
    scene.setReducedMotion(true);
    clock.value = 50_000;
    scene.setReducedMotion(false);
    scheduler.tick(50_016);
    expect(group.rotation.y).toBeGreaterThan(spun);
    expect(group.rotation.y - spun).toBeLessThan(spun - staticPose().yaw);
  });
});

describe('SkullScene frame publishing and identical frames', () => {
  it('calls onPresent(canvas, nowMs) synchronously right after each renderer.render, in order', () => {
    const log = [];
    const onPresent = vi.fn();
    const { scene, scheduler, renderers, clock, frame } = setup({ onPresent });
    const original = renderers[0].render.bind(renderers[0]);
    renderers[0].render = (sc, cam) => {
      original(sc, cam);
      log.push('render');
    };
    onPresent.mockImplementation((canvas, nowMs) => {
      expect(canvas).toBe(renderers[0].domElement);
      log.push(`present@${nowMs}`);
    });
    frame.target = 1;
    clock.value = 7;
    scene.start();
    scheduler.tick(0);
    clock.value = 23;
    scheduler.tick(16);
    expect(log).toEqual(['render', 'present@7', 'render', 'present@23']);
  });

  it('publishes the render after a context restore, and nothing while lost', () => {
    const onPresent = vi.fn();
    const { scene, scheduler, renderers } = setup({ onPresent });
    scene.start();
    scheduler.tick(0);
    const r = renderers[0];
    expect(onPresent).toHaveBeenCalledTimes(1);
    r.domElement.dispatchEvent(new Event('webglcontextlost', { cancelable: true }));
    scene.requestPresent();
    scene.invalidate();
    expect(onPresent).toHaveBeenCalledTimes(1);
    r.domElement.dispatchEvent(new Event('webglcontextrestored'));
    expect(onPresent).toHaveBeenCalledTimes(2);
    expect(r.renders).toHaveLength(2);
  });

  it('swallows a throwing onPresent consumer: the scene keeps rendering and stays alive', () => {
    const onPresent = vi.fn(() => {
      throw new Error('glass consumer failed');
    });
    const { scene, scheduler, renderers, frame, callbacks } = setup({ onPresent });
    frame.target = 1;
    scene.start();
    expect(() => scheduler.tick(0)).not.toThrow();
    expect(() => scheduler.tick(16)).not.toThrow();
    expect(onPresent).toHaveBeenCalledTimes(2);
    expect(renderers[0].renders).toHaveLength(2);
    expect(callbacks.onReady).toHaveBeenCalledTimes(1);
    expect(callbacks.onFailure).not.toHaveBeenCalled();
  });

  it('does not publish when the render throws', () => {
    const onPresent = vi.fn();
    const { scene, scheduler, renderers, frame } = setup({ onPresent });
    frame.target = 1;
    scene.start();
    renderers[0].throwOnRender = true;
    scheduler.tick(0);
    expect(onPresent).not.toHaveBeenCalled();
  });

  it('skips render and publish for an identical frame (scroll wake mid-poem)', () => {
    const onPresent = vi.fn();
    const { scene, scheduler, renderers } = setup({ onPresent });
    scene.start();
    scheduler.tick(0);
    expect(renderers[0].renders).toHaveLength(1);
    for (let i = 1; i <= 3; i += 1) {
      scene.invalidate();
      scheduler.tick(i * 16);
    }
    expect(renderers[0].renders).toHaveLength(1);
    expect(onPresent).toHaveBeenCalledTimes(1);
    expect(scheduler.pendingCount).toBe(0);
  });

  it('still renders the first frame, changed frames and a resized frame', () => {
    const { scene, scheduler, renderers, frame } = setup();
    scene.start();
    scheduler.tick(0);
    expect(renderers[0].renders).toHaveLength(1);
    frame.target = 0.5;
    scene.invalidate();
    scheduler.tick(16);
    expect(renderers[0].renders).toHaveLength(2);
    // settle until idle, then a resize changes the w x h key
    for (let ms = 32; scheduler.pendingCount > 0 && ms < 5000; ms += 16) {
      scheduler.tick(ms);
    }
    const settled = renderers[0].renders.length;
    scene.resize(800, 600);
    scheduler.tick(6000);
    expect(renderers[0].renders).toHaveLength(settled + 1);
  });

  it('requestPresent() forces exactly one render and publish even when nothing changed', () => {
    const onPresent = vi.fn();
    const { scene, scheduler, renderers } = setup({ onPresent });
    scene.start();
    scheduler.tick(0);
    scene.requestPresent();
    expect(scheduler.pendingCount).toBe(1);
    scheduler.tick(16);
    expect(renderers[0].renders).toHaveLength(2);
    expect(onPresent).toHaveBeenCalledTimes(2);
    scene.invalidate();
    scheduler.tick(32);
    expect(renderers[0].renders).toHaveLength(2);
    expect(onPresent).toHaveBeenCalledTimes(2);
  });

  it('keeps draw calls at or below 2 and the instance matrices untouched when frames are skipped', () => {
    const { scene, scheduler, renderers, frame } = setup();
    frame.target = 0;
    scene.start();
    scheduler.tick(0);
    const mesh = collect(firstScene(renderers[0]), (o) => o instanceof InstancedMesh)[0];
    const version = mesh.instanceMatrix.version;
    scene.invalidate();
    scheduler.tick(16);
    const draws = collect(firstScene(renderers[0]), (o) => o.visible && (o instanceof InstancedMesh || o.type === 'LineSegments'));
    expect(draws.length).toBeLessThanOrEqual(2);
    expect(mesh.instanceMatrix.version).toBe(version);
  });
});

describe('SkullScene context loss and dispose', () => {
  function lose(canvas) {
    const event = new Event('webglcontextlost', { cancelable: true });
    canvas.dispatchEvent(event);
    return event;
  }

  it('context loss prevents default, pauses, stops frames and calls onLost', () => {
    const { scene, scheduler, renderers, callbacks } = setup();
    scene.start();
    scheduler.tick(0);
    const r = renderers[0];
    const event = lose(r.domElement);
    expect(event.defaultPrevented).toBe(true);
    expect(callbacks.onLost).toHaveBeenCalledTimes(1);
    expect(scheduler.pendingCount).toBe(0);
    const count = r.renders.length;
    scene.setPaused('hidden', true);
    scene.setPaused('hidden', false);
    expect(scheduler.pendingCount).toBe(0);
    expect(r.renders).toHaveLength(count);
  });

  it('context restore renders one frame, then onReady, and resumes the loop', () => {
    const { scene, scheduler, renderers, callbacks } = setup();
    scene.start();
    scheduler.tick(0);
    const r = renderers[0];
    lose(r.domElement);
    callbacks.onReady.mockClear();
    const count = r.renders.length;
    r.domElement.dispatchEvent(new Event('webglcontextrestored'));
    expect(r.renders).toHaveLength(count + 1);
    expect(callbacks.onReady).toHaveBeenCalledTimes(1);
    expect(scheduler.pendingCount).toBe(1);
  });

  it('context restore keeps the assembly state and the uniform values', () => {
    const { scene, scheduler, renderers, uniforms, frame } = setup();
    frame.target = 0.5;
    scene.start();
    scheduler.tick(0);
    const r = renderers[0];
    const progress = uniforms().uProgress;
    expect(progress.value).toBe(0.5);
    lose(r.domElement);
    r.domElement.dispatchEvent(new Event('webglcontextrestored'));
    expect(uniforms().uProgress).toBe(progress);
    expect(progress.value).toBe(0.5);
    expect(scheduler.pendingCount).toBe(1);
    scheduler.tick(16);
    expect(progress.value).toBe(0.5);
  });

  it('restore render failure reports onFailure("restore") and disposes', () => {
    const { scene, scheduler, renderers, callbacks } = setup();
    scene.start();
    scheduler.tick(0);
    const r = renderers[0];
    lose(r.domElement);
    r.throwOnRender = true;
    expect(() => r.domElement.dispatchEvent(new Event('webglcontextrestored'))).not.toThrow();
    expect(callbacks.onFailure).toHaveBeenCalledExactlyOnceWith('restore');
    expect(r.disposed).toBe(1);
    expect(scheduler.pendingCount).toBe(0);
  });

  it('a frame render failure reports onFailure("render") and disposes', () => {
    const { scene, scheduler, renderers, callbacks, frame } = setup();
    frame.target = 1;
    scene.start();
    scheduler.tick(0);
    renderers[0].throwOnRender = true;
    expect(() => scheduler.tick(16)).not.toThrow();
    expect(callbacks.onFailure).toHaveBeenCalledExactlyOnceWith('render');
    expect(renderers[0].disposed).toBe(1);
    expect(scheduler.pendingCount).toBe(0);
  });

  it('dispose releases everything, removes the canvas and is idempotent', () => {
    const { container, scene, scheduler, renderers } = setup();
    scene.start();
    scheduler.tick(0);
    const r = renderers[0];
    const root = firstScene(r);
    const mesh = collect(root, (o) => o instanceof InstancedMesh)[0];
    const lattice = collect(root, (o) => o.type === 'LineSegments')[0];
    const disposed = {
      geometry: vi.fn(),
      material: vi.fn(),
      latticeGeometry: vi.fn(),
      latticeMaterial: vi.fn(),
    };
    mesh.geometry.addEventListener('dispose', disposed.geometry);
    mesh.material.addEventListener('dispose', disposed.material);
    lattice.geometry.addEventListener('dispose', disposed.latticeGeometry);
    lattice.material.addEventListener('dispose', disposed.latticeMaterial);
    const removeSpy = vi.spyOn(r.domElement, 'removeEventListener');

    scene.dispose();
    expect(scheduler.pendingCount).toBe(0);
    expect(disposed.geometry).toHaveBeenCalledTimes(1);
    expect(disposed.material).toHaveBeenCalledTimes(1);
    expect(disposed.latticeGeometry).toHaveBeenCalledTimes(1);
    expect(disposed.latticeMaterial).toHaveBeenCalledTimes(1);
    expect(r.disposed).toBe(1);
    expect(r.contextLosses).toBe(1);
    expect(container.contains(r.domElement)).toBe(false);
    expect(removeSpy.mock.calls.map((c) => c[0]).sort()).toEqual(['webglcontextlost', 'webglcontextrestored']);

    scene.dispose();
    expect(r.disposed).toBe(1);
    expect(r.contextLosses).toBe(1);

    // After dispose, context events and API calls are inert.
    const count = r.renders.length;
    lose(r.domElement);
    r.domElement.dispatchEvent(new Event('webglcontextrestored'));
    scene.setPaused('hidden', false);
    scene.resize(10, 10);
    expect(r.renders).toHaveLength(count);
  });

  it('disposes the atlas texture', () => {
    const atlasDisposed = vi.fn();
    const patchMaterial = (_material, atlas) => {
      atlas.addEventListener('dispose', atlasDisposed);
      return false;
    };
    const { scene, scheduler, renderers } = setup({ deps: { patchMaterial } });
    scene.start();
    scheduler.tick(0);
    scene.dispose();
    expect(atlasDisposed).toHaveBeenCalledTimes(1);
    expect(renderers[0].disposed).toBe(1);
  });

  it('mount -> dispose -> mount ends with exactly one live renderer and one canvas', () => {
    const container = document.createElement('div');
    const renderers = [];
    const make = () =>
      new SkullScene({
        container,
        reducedMotion: false,
        readScrollFrame: () => ({ target: 0 }),
        onReady: vi.fn(),
        onLost: vi.fn(),
        onFailure: vi.fn(),
        deps: {
          createRenderer: () => {
            const r = new FakeRenderer();
            renderers.push(r);
            return r;
          },
          scheduler: new ManualScheduler(),
        },
      });
    const first = make();
    first.start();
    first.dispose();
    const second = make();
    second.start();
    expect(renderers).toHaveLength(2);
    expect(renderers.filter((r) => r.disposed === 0)).toHaveLength(1);
    expect(container.querySelectorAll('canvas')).toHaveLength(1);
    second.dispose();
  });
});
