import { barcodeBars } from '../../lib/hud/barcode.ts';

export interface BarcodeProps {
  /** Same seed, same bars. */
  seed: string;
  /** Extra classes: the frame passes the size. */
  className?: string;
}

const BAR_HEIGHT = 40;

/** Decorative barcode in the ink token. The svg stretches to its box; it carries no data. */
export function Barcode({ seed, className = '' }: BarcodeProps) {
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
