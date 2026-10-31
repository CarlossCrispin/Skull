import { describe, expect, it } from 'vitest';
import { frontMask, countEnclosedVoids } from './frontMask.js';
import { generateSkull } from './generate.js';

/**
 * Structural invariants for the 4.8 visual iteration: tapered mandible, legible
 * teeth, forward accent clusters, closed temple wall. They read the generated model
 * only (no private SDF constants), so they survive geometry tuning.
 */

const LINING_TONE = 3;

function rowRuns(mask, row) {
  let first = -1;
  let last = -1;
  for (let c = 0; c < mask.width; c++) {
    if (mask.cells[row * mask.width + c] === 1) {
      first = first < 0 ? c : first;
      last = c;
    }
  }
  let gaps = 0;
  let inGap = false;
  for (let c = first; c >= 0 && c <= last; c++) {
    const empty = mask.cells[row * mask.width + c] === 0;
    if (empty && !inGap) {
      gaps++;
    }
    inGap = empty;
  }
  return { first, last, gaps };
}

function width(mask, row) {
  const { first, last } = rowRuns(mask, row);
  return first < 0 ? 0 : last - first + 1;
}

function occupancy(model) {
  const set = new Set();
  for (let i = 0; i < model.count; i++) {
    if (model.flat[i] === 0) {
      set.add(model.positions[3 * i] + 48 * (model.positions[3 * i + 1] + 56 * model.positions[3 * i + 2]));
    }
  }
  return set;
}

describe('mandible (point 1): tapers toward the chin', () => {
  const mask = frontMask(generateSkull({ dropout: false }));
  const bottom = mask.height - 1;
  const jawRows = Array.from({ length: 14 }, (_, k) => bottom - 15 + k);
  const widest = Math.max(...jawRows.map((r) => width(mask, r)));
  const widestRow = jawRows.find((r) => width(mask, r) === widest);

  it('the chin row is at least 8 cells narrower than the jaw-angle row', () => {
    expect(widest - width(mask, bottom)).toBeGreaterThanOrEqual(8);
  });

  it('width never grows from the jaw angle down to the chin and shrinks in steps (angled line, not a block)', () => {
    let prev = widest;
    const distinct = new Set([widest]);
    for (let r = widestRow; r <= bottom; r++) {
      const w = width(mask, r);
      expect(w).toBeLessThanOrEqual(prev);
      prev = w;
      distinct.add(w);
    }
    expect(distinct.size).toBeGreaterThanOrEqual(4);
  });
});

describe('teeth (point 2): individual teeth are legible in the front mask', () => {
  const mask = frontMask(generateSkull({ dropout: false }));
  // Tooth bands below the nose (rows >= 41). Upper teeth span more of the jaw than the lower
  // ones (the mandible tapers), so the lower row has fewer gaps.
  const toothRows = (from, to, minGaps) =>
    Array.from({ length: to - from + 1 }, (_, k) => from + k).filter((r) => rowRuns(mask, r).gaps >= minGaps);

  it('upper tooth row: at least 2 rows show >= 5 gaps between teeth', () => {
    expect(toothRows(41, 46, 5).length).toBeGreaterThanOrEqual(2);
  });

  it('lower tooth row: at least 2 rows show >= 4 gaps between teeth', () => {
    expect(toothRows(47, 54, 4).length).toBeGreaterThanOrEqual(2);
  });

  it('gaps are 1-cell wide see-through slits, so the 3/4 view reads them too (never merge into one band)', () => {
    const row = toothRows(41, 46, 5)[0];
    const { first, last } = rowRuns(mask, row);
    let maxGap = 0;
    let run = 0;
    for (let c = first; c <= last; c++) {
      run = mask.cells[row * mask.width + c] === 0 ? run + 1 : 0;
      maxGap = Math.max(maxGap, run);
    }
    expect(maxGap).toBe(1);
  });

  it('still has at least 3 enclosed voids (two sockets and the nose)', () => {
    expect(countEnclosedVoids(mask)).toBeGreaterThanOrEqual(3);
  });
});

describe('accents (point 3): clusters sit near the socket opening and are visible', () => {
  const model = generateSkull();
  const occ = occupancy(model);
  const accents = [];
  for (let i = 0; i < model.count; i++) {
    if (model.flat[i] === 1) {
      accents.push({
        x: model.positions[3 * i],
        y: model.positions[3 * i + 1],
        z: model.positions[3 * i + 2],
        violet: model.positions[3 * i] < 24,
      });
    }
  }

  // Socket opening depth: nearest-to-viewer lining voxel around each socket.
  const openingZ = (violet) => {
    let z = -Infinity;
    for (let i = 0; i < model.count; i++) {
      const x = model.positions[3 * i];
      const y = model.positions[3 * i + 1];
      if (model.flat[i] === 0 && model.tone[i] === LINING_TONE && Math.abs(x - (violet ? 14 : 33)) <= 5 && Math.abs(y - 28) <= 4) {
        z = Math.max(z, model.positions[3 * i + 2]);
      }
    }
    return z;
  };

  it('every accent cube is within 5 cells of its socket front opening', () => {
    for (const violet of [true, false]) {
      const front = openingZ(violet);
      for (const a of accents.filter((c) => c.violet === violet)) {
        expect(front - a.z).toBeLessThanOrEqual(5);
        expect(a.z).toBeLessThanOrEqual(front);
      }
    }
  });

  /** Orthographic ray toward the viewer; true when no skull voxel blocks the cube. */
  const visible = (a, yawDeg, pitchDeg) => {
    const yaw = (yawDeg * Math.PI) / 180;
    const pitch = (pitchDeg * Math.PI) / 180;
    const d = [Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch)];
    for (let t = 0.4; t < 70; t += 0.2) {
      const x = Math.round(a.x + d[0] * t);
      const y = Math.round(a.y + d[1] * t);
      const z = Math.round(a.z + d[2] * t);
      if (occ.has(x + 48 * (y + 56 * z))) {
        return false;
      }
    }
    return true;
  };

  it('front view: every accent cube is visible', () => {
    for (const a of accents) {
      expect(visible(a, 0, 0)).toBe(true);
    }
  });

  it('intro end pose (yaw +30 and -30, slight downward look): at least 2 cubes of each color are visible', () => {
    for (const yaw of [30, -30]) {
      for (const violet of [true, false]) {
        const count = accents.filter((a) => a.violet === violet && visible(a, yaw, 8)).length;
        expect(count).toBeGreaterThanOrEqual(2);
      }
    }
  });
});

describe('temple wall (point 4): sockets run front to back only', () => {
  // Temple band: eye/nose rows (grid y >= 21), from 8 cells in front of the back wall (the
  // through-hole must exit there) to 4 cells behind the front-most rim layer (the rim itself
  // is the face surface, not a tunnel).
  const TEMPLE_MIN_Y = 21;
  const BACK_EXIT_Z = 8;
  const FRONT_RIM_LAYERS = 4;

  for (const dropout of [true, false]) {
    it(`no cavity-lining voxel in the temple band is exposed to a side (+-x) view (dropout ${dropout})`, () => {
      const model = generateSkull({ dropout });
      const occ = occupancy(model);
      let frontZ = -Infinity;
      for (let i = 0; i < model.count; i++) {
        if (model.flat[i] === 0 && model.tone[i] === LINING_TONE && model.positions[3 * i + 1] >= TEMPLE_MIN_Y) {
          frontZ = Math.max(frontZ, model.positions[3 * i + 2]);
        }
      }
      let inBand = 0;
      let exposed = 0;
      for (let i = 0; i < model.count; i++) {
        const x = model.positions[3 * i];
        const y = model.positions[3 * i + 1];
        const z = model.positions[3 * i + 2];
        if (model.flat[i] === 1 || model.tone[i] !== LINING_TONE || y < TEMPLE_MIN_Y || z < BACK_EXIT_Z || z > frontZ - FRONT_RIM_LAYERS) {
          continue;
        }
        inBand++;
        const dir = x >= 24 ? 1 : -1;
        let blocked = false;
        for (let xx = x + dir; xx >= 0 && xx < 48; xx += dir) {
          if (occ.has(xx + 48 * (y + 56 * z))) {
            blocked = true;
            break;
          }
        }
        exposed += blocked ? 0 : 1;
      }
      expect(inBand).toBeGreaterThan(100);
      expect(exposed).toBe(0);
    });
  }
});
