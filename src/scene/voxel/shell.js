/** Linear index into a `w * h * d` occupancy array: x fastest, then y, then z. */
export function voxelIndex(x, y, z, w, h) {
  return x + w * (y + h * z);
}

/**
 * Indices of solid voxels with at least one empty (or out-of-bounds) 6-neighbor,
 * in ascending order. Cavity walls are boundaries and therefore included.
 */
export function extractShell(solid, w, h, d) {
  const at = (x, y, z) =>
    x >= 0 && y >= 0 && z >= 0 && x < w && y < h && z < d && solid[voxelIndex(x, y, z, w, h)] === 1;
  const shell = [];
  for (let z = 0; z < d; z++) {
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (!at(x, y, z)) {
          continue;
        }
        if (
          !at(x - 1, y, z) ||
          !at(x + 1, y, z) ||
          !at(x, y - 1, z) ||
          !at(x, y + 1, z) ||
          !at(x, y, z - 1) ||
          !at(x, y, z + 1)
        ) {
          shell.push(voxelIndex(x, y, z, w, h));
        }
      }
    }
  }
  return shell;
}
