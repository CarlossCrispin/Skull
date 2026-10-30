/**
 * Chamfered-corner geometry of the glass card (design Decision 45). Pure: the card draws its
 * frame from `chamferFramePoints` and the fixed glass window crops itself with `glassClipPolygon`,
 * so both follow the same diagonal cuts at the top-left and bottom-right corners.
 */

/** Cut length, never deeper than half of the shorter side so the diagonals cannot cross. */
function cut(chamfer: number, width: number, height: number): number {
  return Math.min(chamfer, width / 2, height / 2);
}

/**
 * SVG `points` of the card frame: top-left and bottom-right corners cut, drawn `inset` pixels
 * inside the box so a stroke of `2 x inset` is not cropped by the clip.
 */
export function chamferFramePoints(width: number, height: number, chamfer: number, inset = 0.5): string {
  const c = cut(chamfer, width, height);
  const left = inset;
  const top = inset;
  const right = width - inset;
  const bottom = height - inset;
  return [
    [left, top + c],
    [left + c, top],
    [right, top],
    [right, bottom - c],
    [right - c, bottom],
    [left, bottom],
  ]
    .map(([x, y]) => `${x},${y}`)
    .join(' ');
}

/** The glass window and the card, both in viewport pixels; the window spans the card's width. */
export interface ChamferClipGeometry {
  readonly width: number;
  readonly windowTop: number;
  readonly windowHeight: number;
  readonly cardTop: number;
  readonly cardHeight: number;
}

/**
 * CSS `clip-path` for the fixed glass window, in window-local pixels. A chamfer is cut only
 * while it is at least partly inside the window; otherwise that end is a flat edge, so the value
 * does not change while the middle of a tall card scrolls past.
 */
export function glassClipPolygon(geometry: ChamferClipGeometry, chamfer: number): string {
  const { width, windowTop, windowHeight, cardTop, cardHeight } = geometry;
  const c = cut(chamfer, width, cardHeight);
  const top = cardTop - windowTop;
  const bottom = top + cardHeight;
  const points: Array<readonly [number, number]> = [];
  if (top > -c) {
    points.push([0, top + c], [c, top], [width, top]);
  } else {
    points.push([0, 0], [width, 0]);
  }
  if (bottom - c < windowHeight) {
    points.push([width, bottom - c], [width - c, bottom], [0, bottom]);
  } else {
    points.push([width, windowHeight], [0, windowHeight]);
  }
  return `polygon(${points.map(([x, y]) => `${x}px ${y}px`).join(', ')})`;
}

/**
 * SVG `points` of the two corner bracket marks, drawn `inset` pixels inside the box: an L at the
 * top-right and one at the bottom-left, each with arms of `arm` pixels. These are the two corners
 * the chamfer leaves square.
 */
export function chamferBracketPoints(width: number, height: number, arm: number, inset: number): string[] {
  return [
    `${width - inset - arm},${inset} ${width - inset},${inset} ${width - inset},${inset + arm}`,
    `${inset},${height - inset - arm} ${inset},${height - inset} ${inset + arm},${height - inset}`,
  ];
}
