import { barcodeBars } from '../../lib/hud/barcode.js';

/**
 * @typedef {object} BarcodeProps
 * @property {string} seed - Same seed, same bars.
 * @property {string} [className] - Extra classes: the frame passes the size.
 */

const BAR_HEIGHT = 40;

/** Decorative barcode in the ink token. The svg stretches to its box; it carries no data. */
export function Barcode({ seed, className = '' }) {
  const { bars, width } = barcodeBars(seed);
  return (
    <svg
      aria-hidden="true"
      viewBox={`0 0 ${width} ${BAR_HEIGHT}`}
      preserveAspectRatio="none"
      className={`pointer-events-none text-ink ${className}`}
    >
      {bars.map((bar) => (
        <rect key={bar.x} x={bar.x} y={0} width={bar.width} height={BAR_HEIGHT} fill="currentColor" />
      ))}
    </svg>
  );
}
