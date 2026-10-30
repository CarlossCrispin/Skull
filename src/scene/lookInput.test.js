import { afterEach, describe, expect, it, vi } from 'vitest';
import { attachLookInput } from './lookInput.js';

function pointerMove(x, y, pointerType = 'mouse') {
  return Object.assign(new Event('pointermove'), { clientX: x, clientY: y, pointerType });
}

function orientation(gamma, beta) {
  return Object.assign(new Event('deviceorientation'), { gamma, beta });
}

function spyOnWindowListeners() {
  const add = vi.spyOn(window, 'addEventListener');
  const remove = vi.spyOn(window, 'removeEventListener');
  return { add, remove, types: () => add.mock.calls.map((c) => c[0]) };
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  delete window.matchMedia;
});

function finePointer(on) {
  window.matchMedia = vi.fn(() => ({ matches: on }));
}

describe('attachLookInput pointer', () => {
  it('reports the pointer position normalized to the viewport', () => {
    const onLook = vi.fn();
    const detach = attachLookInput(onLook);
    window.dispatchEvent(pointerMove(window.innerWidth, 0));
    expect(onLook).toHaveBeenLastCalledWith({ x: 1, y: -1 });
    window.dispatchEvent(pointerMove(window.innerWidth / 2, window.innerHeight / 2));
    expect(onLook).toHaveBeenLastCalledWith({ x: 0, y: 0 });
    detach();
  });

  it('ignores touch pointers', () => {
    const onLook = vi.fn();
    const detach = attachLookInput(onLook);
    window.dispatchEvent(pointerMove(10, 10, 'touch'));
    expect(onLook).not.toHaveBeenCalled();
    detach();
  });

  it('listens passively and returns to center when the pointer leaves the document', () => {
    const spy = spyOnWindowListeners();
    const onLook = vi.fn();
    const detach = attachLookInput(onLook);
    const move = spy.add.mock.calls.find((c) => c[0] === 'pointermove');
    expect(move[2]).toMatchObject({ passive: true });
    document.documentElement.dispatchEvent(new Event('mouseleave'));
    expect(onLook).toHaveBeenLastCalledWith({ x: 0, y: 0 });
    detach();
  });

  it('removes every listener on detach and stops reporting', () => {
    const onLook = vi.fn();
    const detach = attachLookInput(onLook);
    detach();
    window.dispatchEvent(pointerMove(1, 1));
    document.documentElement.dispatchEvent(new Event('mouseleave'));
    expect(onLook).not.toHaveBeenCalled();
  });
});

describe('attachLookInput device orientation', () => {
  it('does not listen to orientation when a fine pointer exists', () => {
    finePointer(true);
    vi.stubGlobal('DeviceOrientationEvent', class {});
    const spy = spyOnWindowListeners();
    attachLookInput(vi.fn())();
    expect(spy.types()).not.toContain('deviceorientation');
  });

  it('listens to orientation on touch-only devices that need no permission', () => {
    finePointer(false);
    vi.stubGlobal('DeviceOrientationEvent', class {});
    const onLook = vi.fn();
    const detach = attachLookInput(onLook);
    window.dispatchEvent(orientation(15, 45));
    expect(onLook).toHaveBeenLastCalledWith({ x: 0.5, y: 0 });
    detach();
    window.dispatchEvent(orientation(15, 45));
    expect(onLook).toHaveBeenCalledTimes(1);
  });

  it('never requests permission and does not listen where one is required (iOS)', () => {
    finePointer(false);
    const requestPermission = vi.fn();
    vi.stubGlobal('DeviceOrientationEvent', class {
      static requestPermission = requestPermission;
    });
    const spy = spyOnWindowListeners();
    attachLookInput(vi.fn())();
    expect(spy.types()).not.toContain('deviceorientation');
    expect(requestPermission).not.toHaveBeenCalled();
  });

  it('skips orientation events without readings', () => {
    finePointer(false);
    vi.stubGlobal('DeviceOrientationEvent', class {});
    const onLook = vi.fn();
    const detach = attachLookInput(onLook);
    window.dispatchEvent(orientation(null, null));
    expect(onLook).not.toHaveBeenCalled();
    detach();
  });
});
