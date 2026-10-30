import { round3 as n3 } from "../util";
import type { Piece } from "../types";

/**
 * The rain cloud, generated (not in the Inkscape art) from a few overlapping circles ("lobes") on a
 * flat underside, so it is placed from one number: where the rain starts.
 *
 *   - The rain falls from the flat underside, between `rainFrom` and `rainTo`.
 *   - The two end lobes are tangent to the underside, so the outline starts and ends there; the laser
 *     draws it clockwise from the bottom left: up the left end, over the top, down the right end, back
 *     along the underside.
 *   - `rainFrom` is the leftmost raining point; the cloud's left edge is one end-lobe radius further left.
 */

/** One lobe: where its centre is along the underside (from `rainFrom`), its radius; its centre sits `r` * `lift` above the underside. */
interface Lobe {
  dx: number;
  r: number;
  /** Height of the centre above the underside, in units of r (1 = tangent to the underside). */
  lift: number;
}

/** Left to right. Each lobe must overlap the next (checked below). */
const LOBES: Lobe[] = [
  { dx: 0, r: 4.5, lift: 1 }, // left end, tangent to the underside
  { dx: 7, r: 8.5, lift: 1 },
  { dx: 19.5, r: 13, lift: 1.08 },
  { dx: 33, r: 10.5, lift: 1 },
  { dx: 44, r: 6, lift: 1 }, // right end, tangent to the underside
];

export interface CloudSpec {
  /** SVG path data, world coordinates. */
  d: string;
  /** Height of the underside, and where the rain falls from it. */
  base: number;
  rainFrom: number;
  rainTo: number;
  /** Outer extent of the outline. */
  left: number;
  right: number;
  top: number;
}


/** The upper (smaller y) intersection of two circles. */
function upperCrossing(a: { x: number; y: number; r: number }, b: { x: number; y: number; r: number }) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const d = Math.hypot(dx, dy);
  if (d >= a.r + b.r || d <= Math.abs(a.r - b.r)) throw new Error("cloud: neighbouring lobes must overlap");
  const along = (a.r * a.r - b.r * b.r + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(0, a.r * a.r - along * along));
  const mx = a.x + (dx * along) / d;
  const my = a.y + (dy * along) / d;
  const p1 = { x: mx + (h * dy) / d, y: my - (h * dx) / d };
  const p2 = { x: mx - (h * dy) / d, y: my + (h * dx) / d };
  return p1.y < p2.y ? p1 : p2;
}

export function cloudAt(rainFrom: number, base: number): CloudSpec {
  const c = LOBES.map((l) => ({ x: rainFrom + l.dx, y: base - l.r * l.lift, r: l.r }));
  const joints = c.slice(0, -1).map((a, i) => upperCrossing(a, c[i + 1]));

  // Walk the outline clockwise on screen (SVG's positive angles): bottom of the left lobe, up
  // and over the lobes, down to the bottom of the right lobe, then back along the underside.
  const angle = (o: { x: number; y: number }, p: { x: number; y: number }) => Math.atan2(p.y - o.y, p.x - o.x);
  const arc = (o: { x: number; y: number; r: number }, from: { x: number; y: number }, to: { x: number; y: number }) => {
    let span = angle(o, to) - angle(o, from);
    span = ((span % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    return `A${n3(o.r)} ${n3(o.r)} 0 ${span > Math.PI ? 1 : 0} 1 ${n3(to.x)} ${n3(to.y)}`;
  };

  const first = c[0];
  const last = c[c.length - 1];
  const start = { x: first.x, y: base };
  const end = { x: last.x, y: base };
  const parts = [`M${n3(start.x)} ${n3(start.y)}`];
  let from = start;
  for (let i = 0; i < c.length; i++) {
    const to = i < joints.length ? joints[i] : end;
    parts.push(arc(c[i], from, to));
    from = to;
  }
  parts.push(`L${n3(start.x)} ${n3(start.y)}`, "Z");

  return {
    d: parts.join(" "),
    base,
    rainFrom: first.x,
    rainTo: last.x,
    left: first.x - first.r,
    right: last.x + last.r,
    top: Math.min(...c.map((l) => l.y - l.r)),
  };
}

/** The cloud as something the laser draws: one outline, then a soft fill like the water's. */
export function cloudPiece(spec: CloudSpec): Piece {
  return {
    id: "cloud",
    fit: { x: 0, y: 0, scale: 1 },
    glow: 0.6,
    line: 0.85,
    strokes: [{ id: "cloud-outline", d: spec.d, fill: true, fillColor: "var(--low-opacity-secondary)" }],
  };
}
