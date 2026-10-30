import type { VoxelModel } from './model.ts';

/** Front occupancy mask: `cells[row * width + col]`, 1 = occupied; row 0 is the top. */
export interface FrontMask {
  readonly width: number;
  readonly height: number;
  readonly cells: Uint8Array;
}

/** Projects skull voxels (flat = 0) along z. Accent cubes are excluded so they never fill sockets. */
export function frontMask(model: VoxelModel): FrontMask {
  const { w, h } = model.size;
  const cells = new Uint8Array(w * h);
  for (let i = 0; i < model.count; i++) {
    if (model.flat[i] === 1) {
      continue;
    }
    const x = model.positions[3 * i]!;
    const y = model.positions[3 * i + 1]!;
    cells[(h - 1 - y) * w + x] = 1;
  }
  return { width: w, height: h, cells };
}

export function toAscii(mask: FrontMask): string {
  const rows: string[] = [];
  for (let r = 0; r < mask.height; r++) {
    let row = '';
    for (let c = 0; c < mask.width; c++) {
      row += mask.cells[r * mask.width + c] === 1 ? '#' : '.';
    }
    rows.push(row);
  }
  return rows.join('\n');
}

/** Empty 4-connected components that do not touch the mask border. */
export function countEnclosedVoids(mask: FrontMask): number {
  const { width, height, cells } = mask;
  const seen = new Uint8Array(width * height);

  const fill = (start: number): boolean => {
    let touchesBorder = false;
    const stack = [start];
    seen[start] = 1;
    while (stack.length > 0) {
      const cell = stack.pop()!;
      const col = cell % width;
      const row = Math.floor(cell / width);
      if (col === 0 || row === 0 || col === width - 1 || row === height - 1) {
        touchesBorder = true;
      }
      const neighbors: number[] = [];
      if (col > 0) neighbors.push(cell - 1);
      if (col < width - 1) neighbors.push(cell + 1);
      if (row > 0) neighbors.push(cell - width);
      if (row < height - 1) neighbors.push(cell + width);
      for (const n of neighbors) {
        if (cells[n] === 0 && seen[n] === 0) {
          seen[n] = 1;
          stack.push(n);
        }
      }
    }
    return touchesBorder;
  };

  let enclosed = 0;
  for (let cell = 0; cell < width * height; cell++) {
    if (cells[cell] === 0 && seen[cell] === 0 && !fill(cell)) {
      enclosed++;
    }
  }
  return enclosed;
}
