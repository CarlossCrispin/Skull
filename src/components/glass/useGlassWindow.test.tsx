import { act, render } from '@testing-library/react';
import { useRef } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { createFrameMirror, type FrameMirror } from '../../lib/glass/frameMirror.ts';
import { installResizeObserverStub, type ResizeObserverStub } from '../../test/stubs.ts';
import { COLORS } from '../../styles/tokens.ts';
import { GlassWindow } from './GlassWindow.tsx';

const PANEL = { left: 48, docTop: 100, width: 900, height: 3000 };
const scene = { tag: 'gl' } as unknown as HTMLCanvasElement;

interface FakeContext {
  fillStyle: string;
  fillRect: ReturnType<typeof vi.fn>;
  drawImage: ReturnType<typeof vi.fn>;
}

let fake: FakeContext;
let ro: ResizeObserverStub;
let requester: Mock<() => void>;
let mirror: FrameMirror;
let panelEl: HTMLElement;
const originals = { scrollY: 0, innerWidth: 0, innerHeight: 0, getContext: HTMLCanvasElement.prototype.getContext };

function setWindow(values: { scrollY?: number; innerWidth?: number; innerHeight?: number }) {
  for (const [key, value] of Object.entries(values)) {
    Object.defineProperty(window, key, { value, configurable: true, writable: true });
  }
}

function Harness({ suspended = false }: { suspended?: boolean }) {
  const panelRef = useRef<HTMLDivElement>(null);
  return (
    <div
      ref={(el) => {
        panelRef.current = el;
        panelEl = el as HTMLElement;
        if (el !== null) {
          el.getBoundingClientRect = () =>
            ({ left: PANEL.left, top: PANEL.docTop - window.scrollY, width: PANEL.width, height: PANEL.height }) as DOMRect;
        }
      }}
    >
      <GlassWindow panelRef={panelRef} mirror={mirror} suspended={suspended} />
    </div>
  );
}

const windowEl = () => panelEl.querySelector('.glass-window') as HTMLElement;
const copyEl = () => panelEl.querySelector('canvas.glass-copy') as HTMLCanvasElement;
const scroll = (y: number) => {
  setWindow({ scrollY: y });
  window.dispatchEvent(new Event('scroll'));
};

beforeEach(() => {
  PANEL.height = 3000;
  originals.scrollY = window.scrollY;
  originals.innerWidth = window.innerWidth;
  originals.innerHeight = window.innerHeight;
  setWindow({ scrollY: 0, innerWidth: 1000, innerHeight: 800 });
  fake = { fillStyle: '', fillRect: vi.fn(), drawImage: vi.fn() };
  HTMLCanvasElement.prototype.getContext = (() => fake) as unknown as typeof HTMLCanvasElement.prototype.getContext;
  ro = installResizeObserverStub();
  requester = vi.fn<() => void>();
  mirror = createFrameMirror();
  mirror.setRequester(requester);
});

afterEach(() => {
  setWindow(originals);
  HTMLCanvasElement.prototype.getContext = originals.getContext;
});

describe('useGlassWindow mirror wiring', () => {
  it('subscribes to the mirror and requests a frame on mount', () => {
    render(<Harness />);
    expect(requester).toHaveBeenCalledTimes(1);
    mirror.publish(scene, 1);
    expect(fake.drawImage).toHaveBeenCalledTimes(1);
  });

  it('redraws the copy once per published frame, at the viewport size and pixel ratio 1', () => {
    render(<Harness />);
    mirror.publish(scene, 1);
    mirror.publish(scene, 2);
    expect(fake.drawImage).toHaveBeenCalledTimes(2);
    expect(fake.drawImage).toHaveBeenLastCalledWith(scene, 96, 96, 1000, 800);
    expect(fake.fillRect).toHaveBeenCalledWith(0, 0, 1192, 992);
    expect(copyEl().width).toBe(1192);
    expect(copyEl().height).toBe(992);
    expect(Object.values(COLORS)).toContain(fake.fillStyle);
  });

  it('draws nothing while the panel is hidden, then requests a frame when it is revealed', () => {
    const view = render(<Harness suspended />);
    mirror.publish(scene, 1);
    expect(fake.drawImage).not.toHaveBeenCalled();
    requester.mockClear();
    view.rerender(<Harness suspended={false} />);
    expect(requester).toHaveBeenCalledTimes(1);
    mirror.publish(scene, 2);
    expect(fake.drawImage).toHaveBeenCalledTimes(1);
  });

  it('stops drawing and removes its listeners on unmount', () => {
    const removed = vi.spyOn(window, 'removeEventListener');
    const view = render(<Harness />);
    view.unmount();
    mirror.publish(scene, 1);
    expect(fake.drawImage).not.toHaveBeenCalled();
    const types = removed.mock.calls.map(([type]) => type);
    expect(types).toContain('scroll');
    expect(types).toContain('resize');
    removed.mockRestore();
  });

  it('survives a missing 2D context', () => {
    HTMLCanvasElement.prototype.getContext = (() => null) as unknown as typeof HTMLCanvasElement.prototype.getContext;
    render(<Harness />);
    expect(() => mirror.publish(scene, 1)).not.toThrow();
  });
});

describe('useGlassWindow geometry', () => {
  it('clips the window to the panel and aligns the copy with the viewport', () => {
    render(<Harness />);
    // scrollY 0: panel spans 100..3100; the window ends at innerHeight + margin = 960.
    expect(windowEl().style.left).toBe('48px');
    expect(windowEl().style.width).toBe('900px');
    expect(windowEl().style.top).toBe('100px');
    expect(windowEl().style.height).toBe('860px');
    expect(copyEl().style.transform).toBe('translate(-144px, -196px)');
    expect(copyEl().style.width).toBe('1192px');
    expect(copyEl().style.height).toBe('992px');
  });

  it('crops the window to the chamfered card: both cuts at the top, one cut at the end', () => {
    render(<Harness />);
    expect(windowEl().style.clipPath).toBe('polygon(0px 20px, 20px 0px, 900px 0px, 900px 860px, 0px 860px)');
    scroll(2400);
    expect(windowEl().style.clipPath).toBe('polygon(0px 0px, 900px 0px, 900px 840px, 880px 860px, 0px 860px)');
  });

  it('writes no styles while scrolling in the middle of the panel', () => {
    render(<Harness />);
    scroll(500);
    expect(windowEl().style.clipPath).toBe('polygon(0px 0px, 900px 0px, 900px 1120px, 0px 1120px)');
    const watcher = new MutationObserver(() => {});
    watcher.observe(windowEl(), { attributes: true });
    watcher.observe(copyEl(), { attributes: true });
    expect(windowEl().style.top).toBe('-160px');
    scroll(900);
    scroll(1500);
    scroll(2000);
    expect(watcher.takeRecords()).toHaveLength(0);
    expect(windowEl().style.top).toBe('-160px');
    expect(windowEl().style.height).toBe('1120px');
    watcher.disconnect();
  });

  it('tracks the panel ends and writes once per change', () => {
    render(<Harness />);
    scroll(2000);
    const watcher = new MutationObserver(() => {});
    watcher.observe(windowEl(), { attributes: true });
    scroll(2400);
    // panel bottom at 3100 - 2400 = 700: the window now ends at 700.
    expect(windowEl().style.height).toBe('860px');
    expect(watcher.takeRecords().length).toBeGreaterThan(0);
    scroll(2400);
    expect(watcher.takeRecords()).toHaveLength(0);
    watcher.disconnect();
  });

  it('hides the window when the panel is outside the margin band and shows it again', () => {
    render(<Harness />);
    scroll(4000);
    expect(windowEl().style.display).toBe('none');
    scroll(1000);
    expect(windowEl().style.display).not.toBe('none');
  });

  it('re-measures when the panel resizes', () => {
    render(<Harness />);
    PANEL.height = 500;
    act(() => ro.trigger(panelEl, { width: 900, height: 500 }));
    // panel spans 100..600 at scrollY 0, inside the viewport.
    expect(windowEl().style.height).toBe('500px');
  });

  it('resizes the copy and asks for a redraw when the viewport resizes', () => {
    render(<Harness />);
    requester.mockClear();
    setWindow({ innerWidth: 800, innerHeight: 600 });
    act(() => void window.dispatchEvent(new Event('resize')));
    expect(copyEl().width).toBe(992);
    expect(copyEl().height).toBe(792);
    expect(requester).toHaveBeenCalledTimes(1);
    mirror.publish(scene, 1);
    expect(fake.drawImage).toHaveBeenLastCalledWith(scene, 96, 96, 800, 600);
  });

  it('does not redraw on scroll', () => {
    render(<Harness />);
    fake.drawImage.mockClear();
    requester.mockClear();
    scroll(900);
    scroll(2600);
    expect(fake.drawImage).not.toHaveBeenCalled();
    expect(requester).not.toHaveBeenCalled();
  });

  it('moves only the clip on scroll: the copy keeps its overscanned size and the clip never gets an effect', () => {
    render(<Harness />);
    const size = [copyEl().style.width, copyEl().style.height, copyEl().width, copyEl().height];
    scroll(2400);
    expect([copyEl().style.width, copyEl().style.height, copyEl().width, copyEl().height]).toEqual(size);
    expect(windowEl().style.height).toBe('860px');
    expect(copyEl().style.transform).toBe('translate(-144px, 64px)');
    expect(windowEl().style.filter).toBe('');
    expect(windowEl().style.transform).toBe('');
  });
});
