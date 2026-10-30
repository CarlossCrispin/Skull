import { act, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SKULL_ALT } from '../../content/a11y.js';
import { createFrameMirror } from '../../lib/glass/frameMirror.js';
import { installResizeObserverStub } from '../../test/stubs.js';

const hook = vi.hoisted(() => ({
  status: 'loading',
  calls: [],
  inRange: false,
}));

vi.mock('./useSceneDriver.js', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useSceneDriver: (...args) => ({
      ...actual.useSceneDriver(...args),
      inAssemblyRange: hook.inRange,
    }),
  };
});

vi.mock('./useSkullScene.js', () => ({
  useSkullScene: (options) => {
    hook.calls.push(options);
    return hook.status;
  },
}));

const { SkullHero } = await import('./SkullHero.jsx');

function parts() {
  const stage = screen.getByRole('img', { name: SKULL_ALT });
  const poster = stage.querySelector('img');
  const host = stage.querySelector('[data-skull-host]');
  return { stage, poster, host };
}

beforeEach(() => {
  hook.status = 'loading';
  hook.calls = [];
  hook.inRange = false;
  installResizeObserverStub();
});

describe('SkullHero backdrop table', () => {
  it('normal motion, loading (waiting): canvas host transparent and no poster', () => {
    render(<SkullHero opening={{ phase: 'waiting' }} />);
    const { poster, host } = parts();
    expect(poster).toHaveAttribute('src', '/poster.png');
    expect(poster).toHaveAttribute('alt', '');
    expect(poster).toHaveAttribute('aria-hidden', 'true');
    expect(poster).toHaveAttribute('data-visible', 'false');
    expect(poster).toHaveClass('invisible');
    expect(host).toHaveAttribute('data-visible', 'false');
    expect(host).toHaveClass('opacity-0');
  });

  it('normal motion, loading with the opening skipped (scene never ready, G5): faint backdrop, canvas 0', () => {
    render(<SkullHero opening={{ phase: 'done' }} />);
    const { poster, host } = parts();
    expect(poster).toHaveClass('skull-backdrop');
    expect(poster).not.toHaveClass('invisible');
    expect(poster).toHaveAttribute('data-visible', 'true');
    expect(host).toHaveAttribute('data-visible', 'false');
    expect(host).toHaveClass('opacity-0');
  });

  it('G5 late ready: the backdrop hides and the canvas fades in', () => {
    const { rerender } = render(<SkullHero opening={{ phase: 'done' }} />);
    expect(parts().poster).toHaveClass('skull-backdrop');
    hook.status = 'ready';
    rerender(<SkullHero opening={{ phase: 'done' }} />);
    const { poster, host } = parts();
    expect(poster).toHaveClass('invisible');
    expect(poster).toHaveAttribute('data-visible', 'false');
    expect(host).toHaveAttribute('data-visible', 'true');
    expect(host).toHaveClass('skull-fade', 'opacity-100');
  });

  it('normal motion, ready: canvas fades in over 500 ms and the backdrop stays hidden but in the DOM', () => {
    hook.status = 'ready';
    render(<SkullHero opening={{ phase: 'zoom' }} />);
    const { poster, host, stage } = parts();
    expect(host).toHaveAttribute('data-visible', 'true');
    expect(host).toHaveClass('skull-fade', 'opacity-100');
    expect(poster).toHaveAttribute('data-visible', 'false');
    expect(poster).toBeInTheDocument();
    expect(stage).toHaveAttribute('data-fade', 'fade');
  });

  it.each(['lost', 'failed'])('shows the backdrop at the backdrop opacity when %s, with no error UI', (status) => {
    hook.status = status;
    render(<SkullHero />);
    const { poster, host, stage } = parts();
    expect(poster).toHaveAttribute('data-visible', 'true');
    expect(poster).toHaveClass('skull-backdrop');
    expect(poster).not.toHaveClass('invisible');
    expect(host).toHaveAttribute('data-visible', 'false');
    expect(stage.textContent).toBe('');
  });

  it('brings the backdrop back when the context is lost after ready', () => {
    hook.status = 'ready';
    const { rerender } = render(<SkullHero />);
    hook.status = 'lost';
    rerender(<SkullHero />);
    const { poster, host } = parts();
    expect(poster).toHaveAttribute('data-visible', 'true');
    expect(host).toHaveAttribute('data-visible', 'false');
  });

  it.each(['loading', 'ready', 'lost', 'failed'])(
    'reduced motion (%s): canvas hidden, backdrop visible, instant',
    (status) => {
      hook.status = status;
      render(<SkullHero reducedMotion />);
      const { stage, poster, host } = parts();
      expect(stage).toHaveAttribute('data-fade', 'instant');
      expect(host).toHaveAttribute('data-visible', 'false');
      expect(poster).toHaveAttribute('data-visible', 'true');
      expect(poster).toHaveClass('skull-backdrop');
      expect(poster).not.toHaveClass('skull-fade');
    },
  );

  it('is the fixed layer, not the old stage, and has no Block A classes', () => {
    render(<SkullHero />);
    const { stage } = parts();
    expect(stage).toHaveClass('skull-layer');
    expect(stage.className).not.toMatch(/skull-stage/);
  });

  it('exposes exactly one image-role node named by the approved alt copy', () => {
    render(<SkullHero />);
    expect(screen.getAllByRole('img', { hidden: true }).filter((n) => n.getAttribute('role') === 'img')).toHaveLength(1);
    expect(SKULL_ALT).toBe(
      'Calavera tridimensional hecha de cubos, suspendida en el espacio y en lento giro sobre su eje vertical.',
    );
    const { stage, poster, host } = parts();
    expect(stage).toHaveAccessibleName(SKULL_ALT);
    expect(poster).toHaveAttribute('aria-hidden', 'true');
    expect(host).toHaveAttribute('aria-hidden', 'true');
  });

  it('has no visible text, scroll indicator or interactive element', () => {
    render(<SkullHero />);
    const { stage } = parts();
    expect(stage.textContent).toBe('');
    expect(stage.querySelectorAll('a, button, input, select, textarea, [tabindex]')).toHaveLength(0);
  });

  it('hands the scene hook the host, the reduced-motion preference and a scroll-frame reader', () => {
    render(<SkullHero reducedMotion />);
    const options = hook.calls.at(-1);
    expect(options.hostRef.current).toBe(parts().host);
    expect(options.reducedMotion).toBe(true);
    expect(options.readScrollFrame()).toEqual({
      target: 1,
      opening: { phase: 'done', zoom: 1, explode: 1 },
    });
  });
});

describe('SkullHero poster roles (Decision 34)', () => {
  const PHASES = ['waiting', 'zoom', 'hold', 'exploding'];

  it.each(PHASES)('%s, loading: no poster on the normal path and the canvas waits', (phase) => {
    render(<SkullHero opening={{ phase }} />);
    const { poster, host } = parts();
    expect(poster).toHaveClass('invisible');
    expect(poster).not.toHaveClass('skull-full', 'skull-backdrop');
    expect(poster).toHaveAttribute('data-visible', 'false');
    expect(host).toHaveAttribute('data-visible', 'false');
  });

  it.each([...PHASES, 'done'])('%s, ready: poster hidden, canvas fades in', (phase) => {
    hook.status = 'ready';
    render(<SkullHero opening={{ phase }} />);
    const { poster, host } = parts();
    expect(poster).toHaveClass('invisible');
    expect(poster).toHaveAttribute('data-visible', 'false');
    expect(host).toHaveAttribute('data-visible', 'true');
    expect(host).toHaveClass('skull-fade', 'opacity-100');
  });

  it('never renames to the old hold role: skull-hold is gone', () => {
    hook.status = 'failed';
    hook.inRange = true;
    render(<SkullHero opening={{ phase: 'done' }} />);
    expect(parts().poster.className).not.toMatch(/skull-hold/);
  });

  it.each([
    ['reduced motion', 'ready', true],
    ['failed', 'failed', false],
    ['lost', 'lost', false],
  ])('static path (%s): faint poster before the range, full poster inside it, instantly', (_name, status, reduced) => {
    hook.status = status;
    const { rerender } = render(<SkullHero reducedMotion={reduced} opening={{ phase: 'done' }} />);
    expect(parts().poster).toHaveClass('skull-backdrop');
    expect(parts().poster).not.toHaveClass('skull-full');
    expect(parts().host).toHaveAttribute('data-visible', 'false');
    hook.inRange = true;
    rerender(<SkullHero reducedMotion={reduced} opening={{ phase: 'done' }} />);
    const { poster } = parts();
    expect(poster).toHaveClass('skull-full');
    expect(poster).not.toHaveClass('skull-backdrop', 'invisible', 'skull-fade');
    expect(poster).toHaveAttribute('data-visible', 'true');
  });

  it('shows the backdrop on the static path even while the opening phase is still waiting', () => {
    hook.status = 'failed';
    render(<SkullHero opening={{ phase: 'waiting' }} />);
    expect(parts().poster).toHaveClass('skull-backdrop');
  });

  it('does not show the full poster inside the range while the live canvas is up', () => {
    hook.status = 'ready';
    hook.inRange = true;
    render(<SkullHero opening={{ phase: 'done' }} />);
    expect(parts().poster).toHaveClass('invisible');
  });

  it('reports every status change through onStatus', () => {
    const onStatus = vi.fn();
    const { rerender } = render(<SkullHero onStatus={onStatus} />);
    expect(onStatus.mock.calls).toEqual([['loading']]);
    hook.status = 'ready';
    rerender(<SkullHero onStatus={onStatus} />);
    hook.status = 'lost';
    rerender(<SkullHero onStatus={onStatus} />);
    expect(onStatus.mock.calls).toEqual([['loading'], ['ready'], ['lost']]);
  });

  it('wakes the scene on every opening phase change, and only then', () => {
    const invalidate = vi.fn();
    const scene = { invalidate, setPaused: vi.fn(), resize: vi.fn() };
    const { rerender } = render(<SkullHero opening={{ phase: 'waiting' }} />);
    act(() => hook.calls.at(-1).onScene(scene));
    invalidate.mockClear();
    rerender(<SkullHero opening={{ phase: 'waiting' }} />);
    expect(invalidate).not.toHaveBeenCalled();
    rerender(<SkullHero opening={{ phase: 'zoom' }} />);
    expect(invalidate).toHaveBeenCalledTimes(1);
    rerender(<SkullHero opening={{ phase: 'hold' }} />);
    expect(invalidate).toHaveBeenCalledTimes(2);
    rerender(<SkullHero opening={{ phase: 'exploding' }} />);
    expect(invalidate).toHaveBeenCalledTimes(3);
    rerender(<SkullHero opening={{ phase: 'done' }} />);
    expect(invalidate).toHaveBeenCalledTimes(4);
  });

  it('feeds the opening sampler to the scroll frame', () => {
    const sample = { phase: 'hold', zoom: 1, explode: 0 };
    render(<SkullHero opening={{ phase: 'hold' }} sampleOpening={() => sample} />);
    expect(hook.calls.at(-1).readScrollFrame().opening).toEqual(sample);
  });
});

describe('SkullHero frame mirror', () => {
  const canvas = {};
  const fakeScene = () => ({ setPaused: vi.fn(), resize: vi.fn(), invalidate: vi.fn(), requestPresent: vi.fn() });

  it('hands the scene hook the mirror publish as its present callback', () => {
    const mirror = createFrameMirror();
    const sink = vi.fn();
    mirror.subscribe(sink);
    render(<SkullHero mirror={mirror} />);
    const { onPresent } = hook.calls.at(-1);
    expect(onPresent).toBeTypeOf('function');
    onPresent(canvas, 9);
    expect(sink).toHaveBeenCalledWith(canvas, 9);
  });

  it('passes no present callback without a mirror', () => {
    render(<SkullHero />);
    expect(hook.calls.at(-1).onPresent).toBeUndefined();
  });

  it('registers the live scene requestPresent as the mirror requester and clears it on dispose', () => {
    const mirror = createFrameMirror();
    render(<SkullHero mirror={mirror} />);
    const scene = fakeScene();
    act(() => hook.calls.at(-1).onScene(scene));
    mirror.requestFrame();
    expect(scene.requestPresent).toHaveBeenCalledTimes(1);
    act(() => hook.calls.at(-1).onScene(null));
    mirror.requestFrame();
    expect(scene.requestPresent).toHaveBeenCalledTimes(1);
  });
});
