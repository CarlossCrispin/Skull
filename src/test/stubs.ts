// Controllable browser API stubs for jsdom. Each installer returns a handle with
// trigger helpers and a `restore` function; `restoreAllStubs` runs after every test.

type Restore = () => void;
const activeRestores = new Set<Restore>();

function register(restore: Restore): Restore {
  const wrapped: Restore = () => {
    if (activeRestores.delete(wrapped)) restore();
  };
  activeRestores.add(wrapped);
  return wrapped;
}

export function restoreAllStubs(): void {
  for (const restore of [...activeRestores]) restore();
}

// --- matchMedia -------------------------------------------------------------

export interface MatchMediaStub {
  setMatches(query: string, matches: boolean): void;
  listenerCount(query: string): number;
  restore(): void;
}

export function installMatchMediaStub(initial: Record<string, boolean> = {}): MatchMediaStub {
  const original = window.matchMedia;
  const state = new Map<string, boolean>(Object.entries(initial));
  const listeners = new Map<string, Set<(event: MediaQueryListEvent) => void>>();

  const setFor = (query: string): Set<(event: MediaQueryListEvent) => void> => {
    let set = listeners.get(query);
    if (!set) {
      set = new Set();
      listeners.set(query, set);
    }
    return set;
  };

  window.matchMedia = (query: string): MediaQueryList => {
    const list = {
      media: query,
      onchange: null,
      get matches() {
        return state.get(query) ?? false;
      },
      addEventListener: (type: string, listener: EventListenerOrEventListenerObject) => {
        if (type === 'change' && typeof listener === 'function') {
          setFor(query).add(listener as (event: MediaQueryListEvent) => void);
        }
      },
      removeEventListener: (type: string, listener: EventListenerOrEventListenerObject) => {
        if (type === 'change' && typeof listener === 'function') {
          setFor(query).delete(listener as (event: MediaQueryListEvent) => void);
        }
      },
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    };
    return list as unknown as MediaQueryList;
  };

  const restore = register(() => {
    window.matchMedia = original;
  });

  return {
    setMatches(query, matches) {
      state.set(query, matches);
      const event = { matches, media: query } as MediaQueryListEvent;
      for (const listener of [...setFor(query)]) listener(event);
    },
    listenerCount: (query) => setFor(query).size,
    restore,
  };
}

// --- IntersectionObserver ---------------------------------------------------

export interface IntersectionObserverStub {
  trigger(target: Element, ratio: number): void;
  /** Delivers several entries in one callback, like a real observer batch. */
  triggerBatch(entries: ReadonlyArray<readonly [Element, number]>): void;
  disconnectCount(): number;
  observed(): Element[];
  restore(): void;
}

export function installIntersectionObserverStub(): IntersectionObserverStub {
  const original = globalThis.IntersectionObserver;
  const instances = new Set<StubIntersectionObserver>();
  let disconnects = 0;

  class StubIntersectionObserver {
    readonly root = null;
    readonly rootMargin = '0px';
    readonly thresholds: readonly number[] = [];
    readonly targets = new Set<Element>();
    readonly callback: IntersectionObserverCallback;
    constructor(callback: IntersectionObserverCallback) {
      this.callback = callback;
      instances.add(this);
    }
    observe(target: Element): void {
      this.targets.add(target);
    }
    unobserve(target: Element): void {
      this.targets.delete(target);
    }
    disconnect(): void {
      disconnects++;
      this.targets.clear();
    }
    takeRecords(): IntersectionObserverEntry[] {
      return [];
    }
  }

  globalThis.IntersectionObserver = StubIntersectionObserver as unknown as typeof IntersectionObserver;
  const restore = register(() => {
    globalThis.IntersectionObserver = original;
  });

  return {
    trigger(target, ratio) {
      for (const observer of [...instances]) {
        if (!observer.targets.has(target)) continue;
        const entry = {
          target,
          intersectionRatio: ratio,
          isIntersecting: ratio > 0,
        } as IntersectionObserverEntry;
        observer.callback([entry], observer as unknown as IntersectionObserver);
      }
    },
    triggerBatch(entries) {
      for (const observer of [...instances]) {
        const mine = entries.filter(([target]) => observer.targets.has(target));
        if (mine.length === 0) continue;
        const records = mine.map(
          ([target, ratio]) =>
            ({ target, intersectionRatio: ratio, isIntersecting: ratio > 0 }) as IntersectionObserverEntry,
        );
        observer.callback(records, observer as unknown as IntersectionObserver);
      }
    },
    disconnectCount: () => disconnects,
    observed: () => [...instances].flatMap((observer) => [...observer.targets]),
    restore,
  };
}

// --- ResizeObserver ---------------------------------------------------------

export interface ResizeObserverStub {
  trigger(target: Element, size: { width: number; height: number }): void;
  restore(): void;
}

export function installResizeObserverStub(): ResizeObserverStub {
  const original = globalThis.ResizeObserver;
  const instances = new Set<StubResizeObserver>();

  class StubResizeObserver {
    readonly targets = new Set<Element>();
    readonly callback: ResizeObserverCallback;
    constructor(callback: ResizeObserverCallback) {
      this.callback = callback;
      instances.add(this);
    }
    observe(target: Element): void {
      this.targets.add(target);
    }
    unobserve(target: Element): void {
      this.targets.delete(target);
    }
    disconnect(): void {
      this.targets.clear();
    }
  }

  globalThis.ResizeObserver = StubResizeObserver as unknown as typeof ResizeObserver;
  const restore = register(() => {
    globalThis.ResizeObserver = original;
  });

  return {
    trigger(target, size) {
      for (const observer of [...instances]) {
        if (!observer.targets.has(target)) continue;
        const entry = {
          target,
          contentRect: { ...size, x: 0, y: 0, top: 0, left: 0, right: size.width, bottom: size.height },
        } as ResizeObserverEntry;
        observer.callback([entry], observer as unknown as ResizeObserver);
      }
    },
    restore,
  };
}
