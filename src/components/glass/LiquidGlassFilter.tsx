import { GLASS_FILTER_ID } from '../../lib/glass/constants.ts';

// Channel isolation: keep one of R, G or B, leave alpha as it is. The alpha row `0 0 0 1 0`
// is a design fill (the user's reference gives only the three displacement scales).
const KEEP_RED = '1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0';
const KEEP_GREEN = '0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0';
const KEEP_BLUE = '0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0';

/**
 * Inline SVG definition of the liquid glass refraction (design Decision 37). The values are
 * the user's reference verbatim: region, noise, edge mask, arithmetic composite, three
 * displacement scales and two screen blends. Design fills, not given by the user: the RGB
 * rows of the alpha-boost matrix (zero), k2 to k4 of the composite (zero) and the alpha row
 * of the isolation matrices (identity). The `feGaussianBlur` only builds the edge mask; it
 * never blurs content. The element is hidden decoration, 0 by 0, and out of the layout.
 */
export function LiquidGlassFilter() {
  return (
    <svg aria-hidden="true" focusable="false" width="0" height="0" className="absolute">
      <filter
        id={GLASS_FILTER_ID}
        x="-30%"
        y="-30%"
        width="160%"
        height="160%"
        colorInterpolationFilters="sRGB"
      >
        <feTurbulence type="fractalNoise" baseFrequency="0.012 0.015" numOctaves="3" result="noise" />
        <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 100 0" result="boost" />
        <feGaussianBlur in="boost" stdDeviation="45" result="blurred" />
        <feComponentTransfer in="blurred" result="mask">
          <feFuncA type="linear" slope="-1.3" intercept="1" />
        </feComponentTransfer>
        <feComposite in="noise" in2="mask" operator="arithmetic" k1="1" k2="0" k3="0" k4="0" result="map" />
        <feDisplacementMap in="SourceGraphic" in2="map" scale="65" xChannelSelector="R" yChannelSelector="G" result="shiftR" />
        <feColorMatrix in="shiftR" type="matrix" values={KEEP_RED} result="red" />
        <feDisplacementMap in="SourceGraphic" in2="map" scale="56" xChannelSelector="R" yChannelSelector="G" result="shiftG" />
        <feColorMatrix in="shiftG" type="matrix" values={KEEP_GREEN} result="green" />
        <feDisplacementMap in="SourceGraphic" in2="map" scale="47" xChannelSelector="R" yChannelSelector="G" result="shiftB" />
        <feColorMatrix in="shiftB" type="matrix" values={KEEP_BLUE} result="blue" />
        <feBlend in="red" in2="green" mode="screen" result="redGreen" />
        <feBlend in="redGreen" in2="blue" mode="screen" />
      </filter>
    </svg>
  );
}
