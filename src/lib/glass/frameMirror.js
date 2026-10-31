
/**
 * @typedef {object} FrameMirror
 * @property {FrameSink} publish - Passed to the scene as `onPresent`; delivers synchronously to every sink.
 * @property {() => void} subscribe
 * @property {Function} setRequester - The scene registers how to force one more present (`requestPresent`); null clears it.
 * @property {Function} requestFrame - Asks the scene for one frame even if nothing changed (a late sink has no copy yet).
 */

/**
 * The channel between the scene and the glass window (design Decision 38). A sink must draw
 * inside `publish`: the WebGL drawing buffer is only valid until the task ends. A sink that
 * throws never starves the others or the scene.
 */
export function createFrameMirror() {
  const sinks = new Set();
  let requester = null;

  return {
    publish: (canvas, nowMs) => {
      for (const sink of [...sinks]) {
        try {
          sink(canvas, nowMs);
        } catch {
          // The glass copy is optional; one failing sink must not affect the rest.
        }
      }
    },
    subscribe(sink) {
      sinks.add(sink);
      return () => {
        sinks.delete(sink);
      };
    },
    setRequester(request) {
      requester = request;
    },
    requestFrame() {
      requester?.();
    },
  };
}
