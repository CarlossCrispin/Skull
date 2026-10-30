import { render } from '@testing-library/react';
import { StrictMode, useLayoutEffect, useRef } from 'react';
import { describe, expect, it } from 'vitest';
import { installIntersectionObserverStub, type IntersectionObserverStub } from '../../test/stubs.ts';
import { useRevealGroup } from './useRevealGroup.ts';

interface ProbeProps {
  reducedMotion?: boolean;
  gateOpen?: boolean;
  withIndicator?: boolean;
  /** Receives the ready flag as seen by a layout effect declared after the hook (before first paint). */
  onLayout?: (ready: boolean) => void;
}

function Probe({ reducedMotion = false, gateOpen, withIndicator = false, onLayout }: ProbeProps) {
  const ref = useRef<HTMLElement>(null);
  useRevealGroup(ref, reducedMotion, gateOpen);
  useLayoutEffect(() => {
    onLayout?.(ref.current?.hasAttribute('data-reveal-ready') === true);
  }, [onLayout]);
  return (
    <section ref={ref} data-testid="section">
      <h1 data-reveal="title">t</h1>
      {[0, 1, 2, 3].map((index) => (
        <p key={index} data-reveal="stanza" data-reveal-index={index}>
          s{index}
        </p>
      ))}
      <small data-reveal="signature">sig</small>
      {withIndicator && <i data-reveal="indicator" />}
    </section>
  );
}

interface Rig {
  stub: IntersectionObserverStub;
  section: HTMLElement;
  title: HTMLElement;
  stanzas: HTMLElement[];
  signature: HTMLElement;
  rerender: (reducedMotion: boolean) => void;
  unmount: () => void;
}

function setup(options: { reducedMotion?: boolean; strict?: boolean } = {}): Rig {
  const stub = installIntersectionObserverStub();
  const wrap = (reducedMotion: boolean) => {
    const probe = <Probe reducedMotion={reducedMotion} />;
    return options.strict ? <StrictMode>{probe}</StrictMode> : probe;
  };
  const view = render(wrap(options.reducedMotion ?? false));
  const q = (selector: string) => view.container.querySelector(selector) as HTMLElement;
  return {
    stub,
    section: q('section'),
    title: q('[data-reveal="title"]'),
    stanzas: [...view.container.querySelectorAll<HTMLElement>('[data-reveal="stanza"]')],
    signature: q('[data-reveal="signature"]'),
    rerender: (reducedMotion) => view.rerender(wrap(reducedMotion)),
    unmount: view.unmount,
  };
}

const revealed = (element: HTMLElement) => element.hasAttribute('data-revealed');
const delay = (element: HTMLElement) => element.style.getPropertyValue('--reveal-delay');

describe('useRevealGroup activation', () => {
  it('marks the section ready and observes every item once initialized', () => {
    const rig = setup();
    expect(rig.section.hasAttribute('data-reveal-ready')).toBe(true);
    expect(rig.stub.observed()).toHaveLength(6);
    for (const item of [rig.title, ...rig.stanzas, rig.signature]) expect(revealed(item)).toBe(false);
  });

  it('keeps an item hidden at ratio 0.14 and reveals it at 0.15', () => {
    const rig = setup();
    rig.stub.trigger(rig.stanzas[0] as HTMLElement, 0.14);
    expect(revealed(rig.stanzas[0] as HTMLElement)).toBe(false);
    rig.stub.trigger(rig.stanzas[0] as HTMLElement, 0.15);
    expect(revealed(rig.stanzas[0] as HTMLElement)).toBe(true);
  });
});

describe('useRevealGroup sequential order', () => {
  it('reveals the title and stanza 1 first when stanza 2 intersects alone', () => {
    const rig = setup();
    rig.stub.trigger(rig.stanzas[1] as HTMLElement, 1);
    expect(revealed(rig.title)).toBe(true);
    expect(revealed(rig.stanzas[0] as HTMLElement)).toBe(true);
    expect(revealed(rig.stanzas[1] as HTMLElement)).toBe(true);
    expect(revealed(rig.stanzas[2] as HTMLElement)).toBe(false);
    expect(revealed(rig.signature)).toBe(false);
    expect(delay(rig.title)).toBe('0ms');
    expect(delay(rig.stanzas[0] as HTMLElement)).toBe('120ms');
    expect(delay(rig.stanzas[1] as HTMLElement)).toBe('240ms');
  });

  it('spaces a full batch 0 to 600 ms with the signature last, whatever the entry order', () => {
    const rig = setup();
    rig.stub.triggerBatch([
      [rig.signature, 1],
      [rig.stanzas[1] as HTMLElement, 1],
      [rig.title, 1],
      [rig.stanzas[0] as HTMLElement, 1],
      [rig.stanzas[3] as HTMLElement, 1],
      [rig.stanzas[2] as HTMLElement, 1],
    ]);
    const delays = [rig.title, ...rig.stanzas, rig.signature].map(delay);
    expect(delays).toEqual(['0ms', '120ms', '240ms', '360ms', '480ms', '600ms']);
  });

  it('gives a later lone stanza 120 ms once the earlier ones revealed', () => {
    const rig = setup();
    rig.stub.trigger(rig.stanzas[0] as HTMLElement, 1);
    rig.stub.trigger(rig.stanzas[2] as HTMLElement, 1);
    expect(revealed(rig.stanzas[1] as HTMLElement)).toBe(true);
    expect(delay(rig.stanzas[1] as HTMLElement)).toBe('120ms');
    expect(delay(rig.stanzas[2] as HTMLElement)).toBe('240ms');
    rig.stub.trigger(rig.signature, 1);
    expect(revealed(rig.stanzas[3] as HTMLElement)).toBe(true);
    expect(delay(rig.signature)).toBe('240ms');
  });

  it('leaves below-threshold entries of a batch out of the plan', () => {
    const rig = setup();
    rig.stub.triggerBatch([
      [rig.stanzas[1] as HTMLElement, 0.1],
      [rig.title, 1],
    ]);
    expect(revealed(rig.title)).toBe(true);
    expect(revealed(rig.stanzas[0] as HTMLElement)).toBe(false);
    expect(revealed(rig.stanzas[1] as HTMLElement)).toBe(false);
  });
});

describe('useRevealGroup one-shot and teardown', () => {
  it('unobserves a revealed item and never re-hides it', () => {
    const rig = setup();
    const stanza = rig.stanzas[0] as HTMLElement;
    rig.stub.trigger(stanza, 1);
    expect(rig.stub.observed()).not.toContain(stanza);
    rig.stub.trigger(stanza, 0);
    rig.stub.trigger(stanza, 1);
    expect(revealed(stanza)).toBe(true);
    expect(delay(stanza)).toBe('120ms');
  });

  it('disconnects the observer when every item is revealed', () => {
    const rig = setup();
    expect(rig.stub.disconnectCount()).toBe(0);
    rig.stub.triggerBatch([rig.title, ...rig.stanzas, rig.signature].map((item) => [item, 1] as const));
    expect(rig.stub.disconnectCount()).toBe(1);
    expect(rig.stub.observed()).toHaveLength(0);
  });

  it('disconnects on unmount', () => {
    const rig = setup();
    rig.unmount();
    expect(rig.stub.disconnectCount()).toBe(1);
  });

  it('survives StrictMode double effects with one live observer on all items', () => {
    const rig = setup({ strict: true });
    expect(rig.section.hasAttribute('data-reveal-ready')).toBe(true);
    expect(rig.stub.observed()).toHaveLength(6);
  });
});

describe('useRevealGroup reduced motion', () => {
  it('creates no observer, no ready flag and no inline delay', () => {
    const rig = setup({ reducedMotion: true });
    expect(rig.stub.observed()).toHaveLength(0);
    expect(rig.section.hasAttribute('data-reveal-ready')).toBe(false);
    for (const item of [rig.title, ...rig.stanzas, rig.signature]) expect(delay(item)).toBe('');
  });

  it('removes the ready flag and disconnects when switched to reduce at runtime', () => {
    const rig = setup();
    expect(rig.section.hasAttribute('data-reveal-ready')).toBe(true);
    rig.rerender(true);
    expect(rig.section.hasAttribute('data-reveal-ready')).toBe(false);
    expect(rig.stub.disconnectCount()).toBe(1);
    expect(rig.stub.observed()).toHaveLength(0);
  });

  it('does not re-observe items that already revealed when motion returns', () => {
    const rig = setup();
    rig.stub.trigger(rig.title, 1);
    rig.rerender(true);
    rig.rerender(false);
    expect(rig.section.hasAttribute('data-reveal-ready')).toBe(true);
    expect(rig.stub.observed()).toHaveLength(5);
    expect(rig.stub.observed()).not.toContain(rig.title);
  });
});

describe('useRevealGroup without IntersectionObserver', () => {
  it('leaves the text visible when the hook cannot initialize', () => {
    const original = globalThis.IntersectionObserver;
    // @ts-expect-error simulate an environment without IntersectionObserver
    delete globalThis.IntersectionObserver;
    try {
      const view = render(<Probe />);
      const section = view.container.querySelector('section') as HTMLElement;
      expect(section.hasAttribute('data-reveal-ready')).toBe(false);
      expect(view.container.textContent).toContain('sig');
    } finally {
      globalThis.IntersectionObserver = original;
    }
  });
});

describe('useRevealGroup gate', () => {
  function gated(options: { gateOpen: boolean; withIndicator?: boolean; onLayout?: (ready: boolean) => void }) {
    const stub = installIntersectionObserverStub();
    const make = (gateOpen: boolean) => (
      <Probe gateOpen={gateOpen} withIndicator={options.withIndicator} onLayout={options.onLayout} />
    );
    const view = render(make(options.gateOpen));
    const q = (selector: string) => view.container.querySelector(selector) as HTMLElement;
    return {
      stub,
      section: q('section'),
      title: q('[data-reveal="title"]'),
      stanzas: [...view.container.querySelectorAll<HTMLElement>('[data-reveal="stanza"]')],
      signature: q('[data-reveal="signature"]'),
      indicator: view.container.querySelector<HTMLElement>('[data-reveal="indicator"]'),
      setGate: (open: boolean) => view.rerender(make(open)),
    };
  }

  it('sets the hidden state in a layout effect, before the first paint, while the gate is closed', () => {
    const seen: boolean[] = [];
    const rig = gated({ gateOpen: false, onLayout: (ready) => seen.push(ready) });
    expect(seen).toEqual([true]);
    expect(rig.section.hasAttribute('data-reveal-ready')).toBe(true);
  });

  it('creates no observer while the gate is closed and starts it when the gate opens', () => {
    const rig = gated({ gateOpen: false });
    expect(rig.stub.observed()).toHaveLength(0);
    rig.stub.trigger(rig.title, 1);
    expect(rig.title.hasAttribute('data-revealed')).toBe(false);
    rig.setGate(true);
    expect(rig.stub.observed()).toHaveLength(6);
    expect(rig.section.hasAttribute('data-reveal-ready')).toBe(true);
  });

  it('reveals the items already in view together, in order, once the gate opens', () => {
    const rig = gated({ gateOpen: false });
    rig.setGate(true);
    rig.stub.triggerBatch([
      [rig.stanzas[0] as HTMLElement, 1],
      [rig.title, 1],
    ]);
    expect(rig.title.hasAttribute('data-revealed')).toBe(true);
    expect(rig.stanzas[0]?.hasAttribute('data-revealed')).toBe(true);
    expect(rig.title.style.getPropertyValue('--reveal-delay')).toBe('0ms');
    expect(rig.stanzas[0]?.style.getPropertyValue('--reveal-delay')).toBe('120ms');
    expect(rig.stanzas[1]?.hasAttribute('data-revealed')).toBe(false);
  });

  it('keeps ratio 0.14 hidden and 0.15 revealed after the gate opens', () => {
    const rig = gated({ gateOpen: false });
    rig.setGate(true);
    rig.stub.trigger(rig.stanzas[2] as HTMLElement, 0.14);
    expect(rig.stanzas[2]?.hasAttribute('data-revealed')).toBe(false);
    rig.stub.trigger(rig.stanzas[2] as HTMLElement, 0.15);
    expect(rig.stanzas[2]?.hasAttribute('data-revealed')).toBe(true);
  });

  it('keeps the hidden state but disconnects the observer when the gate closes again', () => {
    const rig = gated({ gateOpen: false });
    rig.setGate(true);
    expect(rig.section.hasAttribute('data-reveal-ready')).toBe(true);
    rig.setGate(false);
    expect(rig.stub.disconnectCount()).toBe(1);
    expect(rig.section.hasAttribute('data-reveal-ready')).toBe(true);
  });

  it('reveals the indicator last: 120 ms alone, after the signature in a batch', () => {
    const alone = gated({ gateOpen: true, withIndicator: true });
    alone.stub.triggerBatch([...alone.stanzas, alone.signature, alone.title].map((item) => [item, 1] as const));
    alone.stub.trigger(alone.indicator as HTMLElement, 1);
    expect(alone.indicator?.style.getPropertyValue('--reveal-delay')).toBe('120ms');
    document.body.innerHTML = '';
    const batch = gated({ gateOpen: true, withIndicator: true });
    batch.stub.triggerBatch(
      [batch.title, ...batch.stanzas, batch.signature, batch.indicator as HTMLElement].map((item) => [item, 1] as const),
    );
    expect(batch.signature.style.getPropertyValue('--reveal-delay')).toBe('600ms');
    expect(batch.indicator?.style.getPropertyValue('--reveal-delay')).toBe('720ms');
  });

  it('ignores a closed gate under reduced motion: visible text, no hidden state, no observer', () => {
    const stub = installIntersectionObserverStub();
    const view = render(<Probe reducedMotion gateOpen={false} />);
    const section = view.container.querySelector('section') as HTMLElement;
    expect(section.hasAttribute('data-reveal-ready')).toBe(false);
    expect(stub.observed()).toHaveLength(0);
  });
});
