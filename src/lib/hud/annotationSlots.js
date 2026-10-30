/**
 * Candidate anchors for the skull annotation cards (frame 00). Two columns by four rows over the skull
 * area (about 30%-70% down), clear of the three nodes above (row 1 starts below them) and of most of the
 * title block. `side` picks the edge the card hangs from: `left` anchors its left edge at
 * SLOT_COLUMN_EDGE_PCT of the frame, `right` its right edge at the same distance from the right.
 * `top` is the card's top edge in percent of the frame height.
 *
 * Collision-free by construction: any two distinct slots are in different columns or rows. Rows are
 * SLOT_ROW_PITCH_PCT apart (a card is about 50 px tall, so 10% needs a frame of at least 500 px), and
 * the columns do not touch at md (768 px): 2 x (24% + 192 px) leaves a 2% gap.
 */
export const CARD_WIDTH_PX = 192;
export const SLOT_COLUMN_EDGE_PCT = 24;
export const SLOT_ROW_PITCH_PCT = 10;

const ROWS = [36, 46, 56, 66];

export const ANNOTATION_SLOTS = [
  ...ROWS.map((top, index) => ({ id: `L${index + 1}`, side: 'left', top })),
  ...ROWS.map((top, index) => ({ id: `R${index + 1}`, side: 'right', top })),
];

/** Picks `count` distinct slots (partial Fisher-Yates over a copy). `random` returns a float in [0, 1). */
export function pickSlots(random = Math.random, count = 4) {
  const pool = [...ANNOTATION_SLOTS];
  for (let i = 0; i < count; i += 1) {
    const j = i + Math.floor(random() * (pool.length - i));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, count);
}
