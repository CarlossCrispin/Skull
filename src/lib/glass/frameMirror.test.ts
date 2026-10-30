import { describe, expect, it, vi } from 'vitest';
import { createFrameMirror } from './frameMirror.ts';

const canvas = {} as HTMLCanvasElement;

describe('frame mirror publish and subscribe', () => {
  it('calls every sink synchronously with the same arguments', () => {
    const mirror = createFrameMirror();
    const first = vi.fn();
    const second = vi.fn();
    mirror.subscribe(first);
    mirror.subscribe(second);
    mirror.publish(canvas, 123);
    expect(first).toHaveBeenCalledTimes(1);
    expect(first).toHaveBeenCalledWith(canvas, 123);
    expect(second).toHaveBeenCalledWith(canvas, 123);
  });

  it('stops delivery after unsubscribe and leaves other sinks alone', () => {
    const mirror = createFrameMirror();
    const gone = vi.fn();
    const stays = vi.fn();
    const unsubscribe = mirror.subscribe(gone);
    mirror.subscribe(stays);
    mirror.publish(canvas, 1);
    unsubscribe();
    mirror.publish(canvas, 2);
    expect(gone).toHaveBeenCalledTimes(1);
    expect(stays).toHaveBeenCalledTimes(2);
  });

  it('is a no-op without sinks and publish can be passed around unbound', () => {
    const mirror = createFrameMirror();
    const { publish } = mirror;
    expect(() => publish(canvas, 1)).not.toThrow();
    const late = vi.fn();
    mirror.subscribe(late);
    publish(canvas, 2);
    expect(late).toHaveBeenCalledWith(canvas, 2);
  });

  it('keeps delivering to the other sinks when one sink throws', () => {
    const mirror = createFrameMirror();
    const after = vi.fn();
    mirror.subscribe(() => {
      throw new Error('sink failure');
    });
    mirror.subscribe(after);
    expect(() => mirror.publish(canvas, 5)).not.toThrow();
    expect(after).toHaveBeenCalledWith(canvas, 5);
  });

  it('tolerates a sink that unsubscribes while it is being called', () => {
    const mirror = createFrameMirror();
    const after = vi.fn();
    const unsubscribe = mirror.subscribe(() => unsubscribe());
    mirror.subscribe(after);
    mirror.publish(canvas, 1);
    mirror.publish(canvas, 2);
    expect(after).toHaveBeenCalledTimes(2);
  });
});

describe('frame mirror requester', () => {
  it('calls the registered requester once per requestFrame', () => {
    const mirror = createFrameMirror();
    const request = vi.fn();
    mirror.setRequester(request);
    mirror.requestFrame();
    expect(request).toHaveBeenCalledTimes(1);
    mirror.requestFrame();
    expect(request).toHaveBeenCalledTimes(2);
  });

  it('does nothing and does not throw without a requester', () => {
    const mirror = createFrameMirror();
    expect(() => mirror.requestFrame()).not.toThrow();
  });

  it('clears the requester with null and replaces it with a new one', () => {
    const mirror = createFrameMirror();
    const first = vi.fn();
    const second = vi.fn();
    mirror.setRequester(first);
    mirror.setRequester(null);
    mirror.requestFrame();
    expect(first).not.toHaveBeenCalled();
    mirror.setRequester(second);
    mirror.requestFrame();
    expect(second).toHaveBeenCalledTimes(1);
  });
});
