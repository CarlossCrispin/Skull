/**
 * Pure signed-distance primitives in voxel units. Every primitive is centered
 * at the origin; callers translate the query point. Negative = inside.
 */

export function sdSphere(px, py, pz, r) {
  return Math.hypot(px, py, pz) - r;
}

/** Bounded ellipsoid approximation (exact on the surface, close nearby). */
export function sdEllipsoid(
  px,
  py,
  pz,
  rx,
  ry,
  rz,
) {
  const k0 = Math.hypot(px / rx, py / ry, pz / rz);
  const k1 = Math.hypot(px / (rx * rx), py / (ry * ry), pz / (rz * rz));
  if (k1 === 0) {
    return -Math.min(rx, ry, rz);
  }
  return (k0 * (k0 - 1)) / k1;
}

/** Box with half extents (hx, hy, hz). */
export function sdBox(
  px,
  py,
  pz,
  hx,
  hy,
  hz,
) {
  const qx = Math.abs(px) - hx;
  const qy = Math.abs(py) - hy;
  const qz = Math.abs(pz) - hz;
  const outside = Math.hypot(Math.max(qx, 0), Math.max(qy, 0), Math.max(qz, 0));
  return outside + Math.min(Math.max(qx, qy, qz), 0);
}

/** Box with rounded edges; the outer half extents stay (hx, hy, hz). */
export function sdRoundBox(
  px,
  py,
  pz,
  hx,
  hy,
  hz,
  r,
) {
  return sdBox(px, py, pz, hx - r, hy - r, hz - r) - r;
}

/** Capsule around the segment a-b with radius r. */
export function sdCapsule(
  px,
  py,
  pz,
  ax,
  ay,
  az,
  bx,
  by,
  bz,
  r,
) {
  const pax = px - ax;
  const pay = py - ay;
  const paz = pz - az;
  const bax = bx - ax;
  const bay = by - ay;
  const baz = bz - az;
  const h = Math.min(
    Math.max((pax * bax + pay * bay + paz * baz) / (bax * bax + bay * bay + baz * baz), 0),
    1,
  );
  return Math.hypot(pax - bax * h, pay - bay * h, paz - baz * h) - r;
}

function sdSegmentSq(
  px,
  py,
  ax,
  ay,
  bx,
  by,
) {
  const ex = bx - ax;
  const ey = by - ay;
  const wx = px - ax;
  const wy = py - ay;
  const t = Math.min(Math.max((wx * ex + wy * ey) / (ex * ex + ey * ey), 0), 1);
  const dx = wx - ex * t;
  const dy = wy - ey * t;
  return dx * dx + dy * dy;
}

/**
 * Isosceles triangle prism, apex up (+y), base down: half width `hw` and half
 * height `hh` in xy, extruded `hd` either side of z. `hd` may be Infinity to
 * make a through-hole.
 */
export function sdTriPrism(
  px,
  py,
  pz,
  hw,
  hh,
  hd,
) {
  // vertices: left base (-hw,-hh), right base (hw,-hh), apex (0,hh)
  const d2 = Math.sqrt(
    Math.min(
      sdSegmentSq(px, py, -hw, -hh, hw, -hh),
      sdSegmentSq(px, py, hw, -hh, 0, hh),
      sdSegmentSq(px, py, 0, hh, -hw, -hh),
    ),
  );
  const cross = (ax, ay, bx, by) =>
    (bx - ax) * (py - ay) - (by - ay) * (px - ax);
  const c1 = cross(-hw, -hh, hw, -hh);
  const c2 = cross(hw, -hh, 0, hh);
  const c3 = cross(0, hh, -hw, -hh);
  const inside = (c1 >= 0 && c2 >= 0 && c3 >= 0) || (c1 <= 0 && c2 <= 0 && c3 <= 0);
  const planar = inside ? -d2 : d2;
  const wz = Math.abs(pz) - hd;
  return Math.min(Math.max(planar, wz), 0) + Math.hypot(Math.max(planar, 0), Math.max(wz, 0));
}

export function opUnion(a, b) {
  return Math.min(a, b);
}

export function opIntersect(a, b) {
  return Math.max(a, b);
}

/** Carves `b` out of `a`. */
export function opSubtract(a, b) {
  return Math.max(a, -b);
}

export function opSmoothUnion(a, b, k) {
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.min(a, b) - h * h * k * 0.25;
}
