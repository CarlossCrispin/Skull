import { fireEvent, render } from '@testing-library/react';
import { StrictMode, useRef } from 'react';
import { describe, expect, it } from 'vitest';
import { installIntersectionObserverStub } from '../../test/stubs.js';
import { useHideOnFirstScroll } from './useHideOnFirstScroll.js';

function Probe() {
  const ref = useRef(null);
  useHideOnFirstScroll(ref);
  return <div ref={ref} data-testid="indicator" />;
}

function setup(strict = false) {
  const stub = installIntersectionObserverStub();
  const view = render(strict ? <StrictMode><Probe /></StrictMode> : <Probe />);
  const indicator = view.container.firstElementChild;
  return { stub, indicator, unmount: view.unmount };
}

const hidden = (element) => element.hasAttribute('data-hidden');
const scroll = () => fireEvent.scroll(window);

describe('useHideOnFirstScroll arming', () => {
  it('observes the indicator and does not hide on scroll before it is armed', () => {
    const { stub, indicator } = setup();
    expect(stub.observed()).toEqual([indicator]);
    scroll();
    expect(hidden(indicator)).toBe(false);
  });

  it('does not arm below 50 % visible', () => {
    const { stub, indicator } = setup();
    stub.trigger(indicator, 0.49);
    scroll();
    expect(hidden(indicator)).toBe(false);
  });

  it('hides on the next scroll once at least 50 % visible (tall viewport at scrollY 0)', () => {
    const { stub, indicator } = setup();
    stub.trigger(indicator, 0.5);
    expect(hidden(indicator)).toBe(false);
    scroll();
    expect(hidden(indicator)).toBe(true);
  });

  it('does not hide on the scroll that reveals it, only on the next one (below the fold)', () => {
    const { stub, indicator } = setup();
    scroll();
    stub.trigger(indicator, 0.6);
    expect(hidden(indicator)).toBe(false);
    scroll();
    expect(hidden(indicator)).toBe(true);
  });

  it('arms on a later intersection after a first one below the threshold', () => {
    const { stub, indicator } = setup();
    stub.trigger(indicator, 0.3);
    stub.trigger(indicator, 0.8);
    scroll();
    expect(hidden(indicator)).toBe(true);
  });
});

describe('useHideOnFirstScroll permanence and teardown', () => {
  it('never shows the indicator again and ignores later scrolls', () => {
    const { stub, indicator } = setup();
    stub.trigger(indicator, 1);
    scroll();
    scroll();
    stub.trigger(indicator, 0);
    stub.trigger(indicator, 1);
    expect(hidden(indicator)).toBe(true);
  });

  it('stops observing once armed (one-shot)', () => {
    const { stub, indicator } = setup();
    stub.trigger(indicator, 1);
    expect(stub.observed()).not.toContain(indicator);
  });

  it('adds a passive once scroll listener only after arming', () => {
    const added = [];
    const original = window.addEventListener.bind(window);
    window.addEventListener = ((type, listener, options) => {
      if (type === 'scroll') added.push([type, options]);
      original(type, listener, options);
    });
    try {
      const { stub, indicator } = setup();
      expect(added).toHaveLength(0);
      stub.trigger(indicator, 1);
      expect(added).toEqual([['scroll', { passive: true, once: true }]]);
    } finally {
      window.addEventListener = original;
    }
  });

  it('removes the observer and the listener on unmount', () => {
    const { stub, indicator, unmount } = setup();
    stub.trigger(indicator, 1);
    unmount();
    expect(stub.disconnectCount()).toBeGreaterThanOrEqual(1);
    scroll();
    expect(hidden(indicator)).toBe(false);
  });

  it('survives StrictMode double effects with a single live observer', () => {
    const { stub, indicator } = setup(true);
    expect(stub.observed()).toEqual([indicator]);
    stub.trigger(indicator, 1);
    scroll();
    expect(hidden(indicator)).toBe(true);
  });
});
