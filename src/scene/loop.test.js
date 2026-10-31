import { describe, expect, it } from 'vitest';
import { FrameLoop } from './loop.js';
import { FakeClock, ManualScheduler } from './testDoubles.js';

function setup() {
  const scheduler = new ManualScheduler();
  const clock = new FakeClock();
  const frames = [];
  const demand = { more: true };
  const loop = new FrameLoop({
    scheduler,
    now: clock.now,
    onFrame: (t, dt) => {
      frames.push({ t, dt });
      return demand.more;
    },
  });
  return { scheduler, clock, frames, loop, demand };
}

describe('FrameLoop', () => {
  it('requests no frame before start or while any pause reason is set', () => {
    const { scheduler, loop } = setup();
    loop.addPause('hidden');
    loop.start();
    expect(scheduler.pendingCount).toBe(0);
    expect(scheduler.requested).toBe(0);
  });

  it('first frame has t = 0 and dt = 0 even when it runs late', () => {
    const { scheduler, frames, loop } = setup();
    loop.start();
    scheduler.tick(3000);
    expect(frames[0]).toEqual({ t: 0, dt: 0 });
  });

  it('accumulates dt and keeps requesting while running', () => {
    const { scheduler, frames, loop } = setup();
    loop.start();
    scheduler.tick(1000);
    scheduler.tick(1016);
    scheduler.tick(1050);
    expect(frames.map((f) => f.t)).toEqual([0, expect.closeTo(0.016, 6), expect.closeTo(0.05, 6)]);
    expect(scheduler.pendingCount).toBe(1);
  });

  it('clamps dt to 0.1 seconds', () => {
    const { scheduler, frames, loop } = setup();
    loop.start();
    scheduler.tick(0);
    scheduler.tick(5000);
    expect(frames[1].dt).toBe(0.1);
    expect(frames[1].t).toBeCloseTo(0.1, 9);
  });

  it('cancels the pending frame when a reason is added and freezes t', () => {
    const { scheduler, frames, loop } = setup();
    loop.start();
    scheduler.tick(0);
    scheduler.tick(100);
    loop.addPause('context-lost');
    expect(scheduler.pendingCount).toBe(0);
    expect(scheduler.tick(200)).toBe(false);
    expect(frames).toHaveLength(2);
    expect(loop.t).toBeCloseTo(0.1, 9);
  });

  it('resumes at t + one clamped dt measured from the resume moment', () => {
    const { scheduler, clock, frames, loop } = setup();
    loop.start();
    scheduler.tick(0);
    scheduler.tick(100);
    loop.addPause('hidden');
    clock.value = 10_100;
    loop.removePause('hidden');
    expect(scheduler.pendingCount).toBe(1);
    scheduler.tick(10_116);
    expect(frames[2].dt).toBeCloseTo(0.016, 9);
    expect(frames[2].t).toBeCloseTo(0.116, 9);
  });

  it('1200 ms of intro then 10 s hidden resumes at about 1200 ms plus one clamped dt', () => {
    const { scheduler, clock, frames, loop } = setup();
    loop.start();
    for (let ms = 0; ms <= 1200; ms += 100) {
      scheduler.tick(ms);
    }
    expect(loop.t).toBeCloseTo(1.2, 9);
    loop.addPause('hidden');
    clock.value = 11_200;
    loop.removePause('hidden');
    scheduler.tick(11_200 + 500);
    expect(frames.at(-1).t).toBeCloseTo(1.3, 9);
  });

  it('does not replay the intro: t never decreases across pauses', () => {
    const { scheduler, clock, frames, loop } = setup();
    loop.start();
    scheduler.tick(0);
    scheduler.tick(100);
    loop.addPause('context-lost');
    clock.value = 500;
    loop.removePause('context-lost');
    scheduler.tick(516);
    const ts = frames.map((f) => f.t);
    expect(ts).toEqual([...ts].sort((a, b) => a - b));
    expect(ts.at(-1)).toBeGreaterThan(0.1);
  });

  it('uses set semantics: stays paused until every reason is cleared', () => {
    const { scheduler, loop } = setup();
    loop.start();
    loop.addPause('hidden');
    loop.addPause('hidden');
    loop.addPause('context-lost');
    loop.removePause('hidden');
    expect(scheduler.pendingCount).toBe(0);
    expect(loop.pauseReasons.has('context-lost')).toBe(true);
    loop.removePause('context-lost');
    expect(scheduler.pendingCount).toBe(1);
  });

  it('supports reduced-motion and hidden alongside context-lost reasons', () => {
    const { scheduler, loop } = setup();
    loop.start();
    loop.addPause('reduced-motion');
    loop.addPause('context-lost');
    loop.addPause('hidden');
    expect(scheduler.pendingCount).toBe(0);
    loop.removePause('reduced-motion');
    loop.removePause('hidden');
    expect(scheduler.pendingCount).toBe(0);
    loop.removePause('context-lost');
    expect(scheduler.pendingCount).toBe(1);
  });

  it('never schedules two frames at once', () => {
    const { scheduler, loop } = setup();
    loop.start();
    loop.start();
    loop.addPause('hidden');
    loop.removePause('hidden');
    loop.removePause('hidden');
    expect(scheduler.pendingCount).toBe(1);
  });

  it('reset() restarts the clock so the next frame has t = 0', () => {
    const { scheduler, frames, loop } = setup();
    loop.start();
    scheduler.tick(0);
    scheduler.tick(100);
    loop.addPause('reduced-motion');
    loop.reset();
    loop.removePause('reduced-motion');
    scheduler.tick(9000);
    expect(frames.at(-1)).toEqual({ t: 0, dt: 0 });
  });

  it('dispose cancels the pending frame and blocks further requests', () => {
    const { scheduler, loop } = setup();
    loop.start();
    loop.dispose();
    expect(scheduler.pendingCount).toBe(0);
    loop.start();
    loop.removePause('hidden');
    expect(scheduler.pendingCount).toBe(0);
  });

  it('schedules the next frame only while onFrame returns true', () => {
    const { scheduler, frames, loop, demand } = setup();
    loop.start();
    scheduler.tick(0);
    expect(scheduler.pendingCount).toBe(1);
    demand.more = false;
    scheduler.tick(16);
    expect(frames).toHaveLength(2);
    expect(scheduler.pendingCount).toBe(0);
    expect(scheduler.tick(32)).toBe(false);
  });

  it('invalidate() on an idle loop re-anchors the clock and requests exactly one frame', () => {
    const { scheduler, clock, frames, loop, demand } = setup();
    loop.start();
    scheduler.tick(0);
    demand.more = false;
    scheduler.tick(100);
    expect(scheduler.pendingCount).toBe(0);
    clock.value = 60_000;
    loop.invalidate();
    loop.invalidate();
    expect(scheduler.pendingCount).toBe(1);
    scheduler.tick(60_016);
    expect(frames.at(-1).dt).toBeCloseTo(0.016, 9);
    expect(frames.at(-1).t).toBeCloseTo(0.116, 9);
    expect(scheduler.pendingCount).toBe(0);
  });

  it('invalidate() does nothing while paused, stopped or disposed', () => {
    const stopped = setup();
    stopped.loop.invalidate();
    expect(stopped.scheduler.requested).toBe(0);

    const paused = setup();
    paused.loop.start();
    paused.scheduler.tick(0);
    paused.demand.more = false;
    paused.scheduler.tick(16);
    paused.loop.addPause('hidden');
    const before = paused.scheduler.requested;
    paused.loop.invalidate();
    expect(paused.scheduler.requested).toBe(before);

    const disposed = setup();
    disposed.loop.start();
    disposed.loop.dispose();
    disposed.loop.invalidate();
    expect(disposed.scheduler.pendingCount).toBe(0);
  });
});
