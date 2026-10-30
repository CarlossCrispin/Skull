/**
 * Placement of the skull annotation cards (frame 00). The cards must never cover the title block, the
 * nodes, the CTA, the info card, the ruler or the nav, and those move with the viewport, so the slots
 * are not fixed: a table of candidate anchors spread over the skull area is filtered at runtime against
 * the measured obstacle rectangles (see `placeAnnotations`).
 *
 * Candidates are card centres in percent of the annotation layer, grouped in eight regions of the skull
 * (cranium, temples, cheekbones and jaw, left and right), two candidates per region. A placement uses at
 * most one candidate per region and at most half of the cards per side, so the cards spread out.
 */
export const CARD_WIDTH_PX = 192;
/** Upper bound of the rendered card height (padding, label line and value line); measured placement is conservative. */
export const CARD_HEIGHT_PX = 56;
/** Free space kept around every obstacle, in px. */
export const OBSTACLE_MARGIN_PX = 12;
/** Free space kept from the layer edges, in px. */
export const EDGE_MARGIN_PX = 8;

const REGIONS = [
  ['cranium-left', [[30, 24], [38, 19]]],
  ['cranium-right', [[62, 19], [70, 24]]],
  ['temple-left', [[27, 36], [33, 43]]],
  ['temple-right', [[73, 36], [67, 43]]],
  ['cheek-left', [[27, 53], [34, 59]]],
  ['cheek-right', [[73, 53], [66, 59]]],
  ['jaw-left', [[30, 70], [38, 80]]],
  ['jaw-right', [[70, 70], [62, 80]]],
];

export const ANNOTATION_CANDIDATES = REGIONS.flatMap(([region, points]) =>
  points.map(([x, y], index) => ({ id: `${region}-${index + 1}`, region, x, y })),
);

/** A `random()` that replays `rolls` in order (then repeats the last one); each call starts a fresh reader. */
export function rollsRandom(rolls) {
  let index = 0;
  return () => rolls[Math.min(index++, rolls.length - 1)];
}

/** Fisher-Yates over a copy. `random` returns a float in [0, 1). */
function shuffled(items, random) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

const intersects = (a, b) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
const hasArea = (rect) => rect.right > rect.left && rect.bottom > rect.top;
const inflate = (rect, by) => ({
  left: rect.left - by,
  top: rect.top - by,
  right: rect.right + by,
  bottom: rect.bottom + by,
});

/**
 * Chooses up to `count` card positions that avoid every obstacle and each other.
 *
 * @param {object} input
 * @param {{ id: string, region: string, x: number, y: number }[]} input.candidates - card centres in percent
 * @param {{ width: number, height: number }} input.cardSize - px
 * @param {{ left: number, top: number, right: number, bottom: number }[]} input.obstacles - px, layer-relative
 * @param {{ width: number, height: number }} input.viewport - the layer size in px
 * @param {() => number} input.random - float in [0, 1); only the order of regions and candidates depends on it
 * @param {number} [input.count]
 * @returns {{ id: string, region: string, side: 'left' | 'right', left: number, top: number }[]} fewer than
 *   `count` when the space runs out, in the order they were chosen
 */
export function placeAnnotations({ candidates, cardSize, obstacles, viewport, random, count = 4 }) {
  const blocked = obstacles.filter(hasArea).map((rect) => inflate(rect, OBSTACLE_MARGIN_PX));
  const bounds = {
    left: EDGE_MARGIN_PX,
    top: EDGE_MARGIN_PX,
    right: viewport.width - EDGE_MARGIN_PX,
    bottom: viewport.height - EDGE_MARGIN_PX,
  };
  const perSide = Math.ceil(count / 2);
  const regions = shuffled([...new Set(candidates.map((c) => c.region))], random);
  const placed = [];
  const perSideCount = { left: 0, right: 0 };

  for (const region of regions) {
    if (placed.length === count) break;
    for (const candidate of shuffled(
      candidates.filter((c) => c.region === region),
      random,
    )) {
      const left = (candidate.x / 100) * viewport.width - cardSize.width / 2;
      const top = (candidate.y / 100) * viewport.height - cardSize.height / 2;
      const rect = { left, top, right: left + cardSize.width, bottom: top + cardSize.height };
      const side = left + cardSize.width / 2 < viewport.width / 2 ? 'left' : 'right';
      const inside =
        rect.left >= bounds.left && rect.top >= bounds.top && rect.right <= bounds.right && rect.bottom <= bounds.bottom;
      if (!inside || perSideCount[side] >= perSide) continue;
      if (blocked.some((o) => intersects(rect, o))) continue;
      if (placed.some((p) => intersects(rect, p.rect))) continue;
      placed.push({ id: candidate.id, region, side, left, top, rect });
      perSideCount[side] += 1;
      break;
    }
  }
  return placed.map(({ rect: _rect, ...slot }) => slot);
}
