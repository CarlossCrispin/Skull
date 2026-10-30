export interface RulerProps {
  /** Scroll progress from 0 (top) to 1 (bottom); omit it to draw the bare ruler. Clamped. */
  progress?: number;
  /** Extra classes: the frame passes the height and position. */
  className?: string;
}

const TICK_STEP = 5;
const LABEL_STEP = 20;
const MAX_VALUE = 100;
const VALUES = Array.from({ length: MAX_VALUE / TICK_STEP + 1 }, (_, i) => i * TICK_STEP);

/**
 * Vertical 0 to 100 ruler: a tick every 5, a longer tick and a mono label every 20, 0 at the top.
 * The optional progress marker is purely visual, so the whole ruler is aria-hidden.
 */
export function Ruler({ progress, className = '' }: RulerProps) {
  return (
    <div aria-hidden="true" className={`pointer-events-none relative w-10 ${className}`}>
      {VALUES.map((value) => {
        const labelled = value % LABEL_STEP === 0;
        return (
          <span key={value} data-ruler-tick={value} style={{ top: `${value}%` }} className={`absolute right-0 border-t border-gray-400 ${labelled ? 'w-4' : 'w-2'}`}>
            {labelled ? (
              <span data-ruler-label="" className="label-mono absolute right-6 -translate-y-1/2 text-gray-400">
                {value}
              </span>
            ) : null}
          </span>
        );
      })}
      {progress === undefined ? null : (
        <span
          data-ruler-indicator=""
          style={{ top: `${Math.min(1, Math.max(0, progress)) * 100}%` }}
          className="absolute inset-x-0 border-t-2 border-signal"
        />
      )}
    </div>
  );
}
