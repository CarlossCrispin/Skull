/**
 * Controllable browser API stubs for jsdom. Each installer returns a handle with
 * trigger helpers and a `restore` function; `restoreAllStubs` runs after every test.
 *
 * @typedef {() => void} Restore
 */
const activeRestores = new Set();

function register(restore) {
  const wrapped = () => {
    if (activeRestores.delete(wrapped)) restore();
  };
  activeRestores.add(wrapped);
  return wrapped;
}

export function restoreAllStubs() {
  for (const restore of [...activeRestores]) restore();
}

/**
 * --- matchMedia -------------------------------------------------------------
 *
 * @typedef {object} MatchMediaStub
 * @property {Function} setMatches
 * @property {number} listenerCount
 * @property {Function} restore
 */

export function installMatchMediaStub(initial = {}) {
  const original = window.matchMedia;
  const state = new Map(Object.entries(initial));
  const listeners = new Map();

  const setFor = (query) => {
    let set = listeners.get(query);
    if (!set) {
      set = new Set();
      listeners.set(query, set);
    }
    return set;
  };

  window.matchMedia = (query) => {
    const list = {
      media: query,
      onchange: null,
      get matches() {
        return state.get(query) ?? false;
      },
      addEventListener: (type, listener) => {
        if (type === 'change' && typeof listener === 'function') {
          setFor(query).add(listener);
        }
      },
      removeEventListener: (type, listener) => {
        if (type === 'change' && typeof listener === 'function') {
          setFor(query).delete(listener);
        }
      },
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    };
    return list;
  };

  const restore = register(() => {
    window.matchMedia = original;
  });

  return {
    setMatches(query, matches) {
      state.set(query, matches);
      const event = { matches, media: query };
      for (const listener of [...setFor(query)]) listener(event);
    },
    listenerCount: (query) => setFor(query).size,
    restore,
  };
}

/**
 * --- IntersectionObserver ---------------------------------------------------
 *
 * @typedef {object} IntersectionObserverStub
 * @property {Function} trigger
 * @property {Function} triggerBatch - Delivers several entries in one callback, like a real observer batch.
 * @property {number} disconnectCount
 * @property {Element[]} observed
 * @property {Function} restore
 */

export function installIntersectionObserverStub() {
  const original = globalThis.IntersectionObserver;
  const instances = new Set();
  let disconnects = 0;

  class StubIntersectionObserver {
    root = null;
    rootMargin = '0px';
    thresholds = [];
    targets = new Set();
    callback;
    constructor(callback) {
      this.callback = callback;
      instances.add(this);
    }
    observe(target) {
      this.targets.add(target);
    }
    unobserve(target) {
      this.targets.delete(target);
    }
    disconnect() {
      disconnects++;
      this.targets.clear();
    }
    takeRecords() {
      return [];
    }
  }

  globalThis.IntersectionObserver = StubIntersectionObserver;
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
        };
        observer.callback([entry], observer);
      }
    },
    triggerBatch(entries) {
      for (const observer of [...instances]) {
        const mine = entries.filter(([target]) => observer.targets.has(target));
        if (mine.length === 0) continue;
        const records = mine.map(
          ([target, ratio]) =>
            ({ target, intersectionRatio: ratio, isIntersecting: ratio > 0 }),
        );
        observer.callback(records, observer);
      }
    },
    disconnectCount: () => disconnects,
    observed: () => [...instances].flatMap((observer) => [...observer.targets]),
    restore,
  };
}

/**
 * --- ResizeObserver ---------------------------------------------------------
 *
 * @typedef {object} ResizeObserverStub
 * @property {Function} trigger
 * @property {Function} restore
 */

export function installResizeObserverStub() {
  const original = globalThis.ResizeObserver;
  const instances = new Set();

  class StubResizeObserver {
    targets = new Set();
    callback;
    constructor(callback) {
      this.callback = callback;
      instances.add(this);
    }
    observe(target) {
      this.targets.add(target);
    }
    unobserve(target) {
      this.targets.delete(target);
    }
    disconnect() {
      this.targets.clear();
    }
  }

  globalThis.ResizeObserver = StubResizeObserver;
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
        };
        observer.callback([entry], observer);
      }
    },
    restore,
  };
}
