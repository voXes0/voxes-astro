import { PATH_TOKEN as TOKEN, round3 } from "./util";
/**
 * Matching two outlines so one can turn into the other.
 *
 * `scene.pose()` blends shapes number by number, which needs the same node structure. A bud petal and
 * its open petal never have it (drawn separately), so `matchShapes` rebuilds both as the same
 * sequence of cubic Béziers WITHOUT changing either shape: every original curve is only split
 * (de Casteljau), never refitted. To line them up:
 *  - each outline is closed, made clockwise (on screen) and cut open at the BASE (where the petal
 *    meets the flower);
 *  - the TIP (farthest point from the base) splits it into arc A (base -> tip, the left side seen
 *    from the base) and arc B (tip -> base, the right side);
 *  - each arc is split into the same number of pieces, so base maps to base, tip to tip, edge to edge.
 *
 * Pure geometry, no DOM: usable at module load.
 */

export type Pt = [number, number];
/** A cubic Bézier: start, two handles, end. */
export type Cubic = [Pt, Pt, Pt, Pt];


/** Path data -> cubics. Supports M L H V C Z (either case), one sub-path. */
export function parsePath(d: string): Cubic[] {
  const t = d.match(TOKEN) ?? [];
  const out: Cubic[] = [];
  let i = 0;
  let cmd = "";
  let x = 0;
  let y = 0;
  let sx = 0;
  let sy = 0;
  const num = () => parseFloat(t[i++]);
  const line = (nx: number, ny: number) => {
    out.push([
      [x, y],
      [x + (nx - x) / 3, y + (ny - y) / 3],
      [x + (2 * (nx - x)) / 3, y + (2 * (ny - y)) / 3],
      [nx, ny],
    ]);
    x = nx;
    y = ny;
  };
  while (i < t.length) {
    if (/[a-zA-Z]/.test(t[i])) cmd = t[i++];
    const rel = cmd === cmd.toLowerCase();
    switch (cmd.toLowerCase()) {
      case "m": {
        const a = num();
        const b = num();
        x = rel ? x + a : a;
        y = rel ? y + b : b;
        sx = x;
        sy = y;
        cmd = rel ? "l" : "L"; // further pairs are lines
        break;
      }
      case "l": {
        const a = num();
        const b = num();
        line(rel ? x + a : a, rel ? y + b : b);
        break;
      }
      case "h": {
        const a = num();
        line(rel ? x + a : a, y);
        break;
      }
      case "v": {
        const b = num();
        line(x, rel ? y + b : b);
        break;
      }
      case "c": {
        const v = [0, 0, 0, 0, 0, 0].map(num);
        const o = rel ? [x, y] : [0, 0];
        const p1: Pt = [v[0] + o[0], v[1] + o[1]];
        const p2: Pt = [v[2] + o[0], v[3] + o[1]];
        const p3: Pt = [v[4] + o[0], v[5] + o[1]];
        out.push([[x, y], p1, p2, p3]);
        [x, y] = p3;
        break;
      }
      case "z":
        if (Math.hypot(x - sx, y - sy) > 1e-6) line(sx, sy);
        break;
      default:
        throw new Error(`fabricator/morph: unsupported path command "${cmd}"`);
    }
  }
  return out;
}

/** The same curve run backwards. */
export const reversed = (segs: Cubic[]): Cubic[] =>
  segs
    .map((c): Cubic => [c[3], c[2], c[1], c[0]])
    .reverse();

const lerp = (a: Pt, b: Pt, t: number): Pt => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

const at = (c: Cubic, t: number): Pt => {
  const u = 1 - t;
  const w = [u * u * u, 3 * u * u * t, 3 * u * t * t, t * t * t];
  return [
    w[0] * c[0][0] + w[1] * c[1][0] + w[2] * c[2][0] + w[3] * c[3][0],
    w[0] * c[0][1] + w[1] * c[1][1] + w[2] * c[2][1] + w[3] * c[3][1],
  ];
};

/** De Casteljau split. */
function split(c: Cubic, t: number): [Cubic, Cubic] {
  const ab = lerp(c[0], c[1], t);
  const bc = lerp(c[1], c[2], t);
  const cd = lerp(c[2], c[3], t);
  const abc = lerp(ab, bc, t);
  const bcd = lerp(bc, cd, t);
  const m = lerp(abc, bcd, t);
  return [
    [c[0], ab, abc, m],
    [m, bcd, cd, c[3]],
  ];
}

/** The part of a cubic between parameters a and b (a < b). */
function slice(c: Cubic, a: number, b: number): Cubic {
  const right = a > 0 ? split(c, a)[1] : c;
  return b >= 1 ? right : split(right, (b - a) / (1 - a))[0];
}

const STEPS = 48;

/** Cumulative arc length at STEPS+1 parameter values (for length <-> t). */
function table(c: Cubic): number[] {
  const acc = [0];
  let prev = c[0];
  for (let k = 1; k <= STEPS; k++) {
    const p = at(c, k / STEPS);
    acc.push(acc[k - 1] + Math.hypot(p[0] - prev[0], p[1] - prev[1]));
    prev = p;
  }
  return acc;
}

const cubicLength = (c: Cubic): number => table(c)[STEPS];
const arcLength = (segs: Cubic[]): number => segs.reduce((s, c) => s + cubicLength(c), 0);

/** Parameter t at which a curve has run `len` of its length. */
function tAtLength(acc: number[], len: number): number {
  if (len <= 0) return 0;
  if (len >= acc[STEPS]) return 1;
  let k = 1;
  while (acc[k] < len) k++;
  const f = (len - acc[k - 1]) / (acc[k] - acc[k - 1] || 1);
  return (k - 1 + f) / STEPS;
}

/** Signed area, screen coordinates: positive = clockwise as seen on screen. */
function area(segs: Cubic[]): number {
  let a = 0;
  for (const c of segs) {
    let prev = c[0];
    for (let k = 1; k <= 8; k++) {
      const p = at(c, k / 8);
      a += prev[0] * p[1] - p[0] * prev[1];
      prev = p;
    }
  }
  return a / 2;
}

/** Where on a closed outline is the point that maximises `score`? -> [segment, t]. */
function best(segs: Cubic[], score: (p: Pt) => number): [number, number] {
  let top = -Infinity;
  let found: [number, number] = [0, 0];
  segs.forEach((c, s) => {
    for (let k = 0; k <= 200; k++) {
      const v = score(at(c, k / 200));
      if (v > top) {
        top = v;
        found = [s, k / 200];
      }
    }
  });
  return found;
}

/** Cut a closed outline at (segment, t) and return it starting there. */
function startAt(segs: Cubic[], [s, t]: [number, number]): Cubic[] {
  const parts = [...segs];
  if (t > 1e-3 && t < 1 - 1e-3) {
    const [a, b] = split(parts[s], t);
    parts.splice(s, 1, a, b);
    return [...parts.slice(s + 1), ...parts.slice(0, s + 1)];
  }
  const first = t >= 1 - 1e-3 ? (s + 1) % parts.length : s;
  return [...parts.slice(first), ...parts.slice(0, first)];
}

/** Both arcs of an outline, split into `n` single-Bézier pieces each. */
function pieces(arc: Cubic[], n: number): Cubic[] {
  const lens = arc.map(cubicLength);
  const total = lens.reduce((a, b) => a + b, 0);
  // Pieces per original curve, in proportion to its length (at least one each).
  const counts = lens.map(() => 1);
  for (let left = n - arc.length; left > 0; left--) {
    let pick = 0;
    let worst = -Infinity;
    lens.forEach((l, i) => {
      const lack = (l / total) * n - counts[i];
      if (lack > worst) {
        worst = lack;
        pick = i;
      }
    });
    counts[pick]++;
  }
  const out: Cubic[] = [];
  arc.forEach((c, i) => {
    const acc = table(c);
    for (let k = 0; k < counts[i]; k++) {
      const a = tAtLength(acc, (acc[STEPS] * k) / counts[i]);
      const b = tAtLength(acc, (acc[STEPS] * (k + 1)) / counts[i]);
      out.push(slice(c, a, b));
    }
  });
  return out;
}

export interface Outline {
  /** Arc A: base -> tip. */
  a: Cubic[];
  /** Arc B: tip -> base. */
  b: Cubic[];
}

/** Close, orient clockwise, cut at the base, split at the tip. */
export function outlineOf(segs: Cubic[], base: Pt): Outline {
  let loop = [...segs];
  const gap = Math.hypot(
    loop[0][0][0] - loop[loop.length - 1][3][0],
    loop[0][0][1] - loop[loop.length - 1][3][1],
  );
  if (gap > 1e-6) {
    const e = loop[loop.length - 1][3];
    const s = loop[0][0];
    loop.push([e, lerp(e, s, 1 / 3), lerp(e, s, 2 / 3), s]);
  }
  if (area(loop) < 0) loop = reversed(loop);
  loop = startAt(loop, best(loop, (p) => -Math.hypot(p[0] - base[0], p[1] - base[1])));
  const origin = loop[0][0];
  const tipAt = best(loop, (p) => Math.hypot(p[0] - origin[0], p[1] - origin[1]));
  const cut = startAt(loop, tipAt); // starts at the tip
  // Where is the base now? It is the node `origin`: find the segment starting there.
  let k = cut.findIndex((c) => Math.hypot(c[0][0] - origin[0], c[0][1] - origin[1]) < 1e-6);
  if (k <= 0) k = Math.max(1, cut.length - 1);
  return { b: cut.slice(0, k), a: cut.slice(k) };
}

const num = round3;
const p = (q: Pt) => `${num(q[0])} ${num(q[1])}`;

function toPath(parts: Cubic[]): string {
  let d = `M${p(parts[0][0])}`;
  for (const c of parts) d += ` C${p(c[1])} ${p(c[2])} ${p(c[3])}`;
  return `${d} Z`;
}

export interface Matched {
  /** The first shape, rebuilt (same outline, new nodes). */
  from: string;
  /** The second shape, rebuilt with exactly the same node structure. */
  to: string;
  /**
   * Fraction of the first shape's length covered by arc A (base -> tip, the left
   * side). The path starts at the base, so the first `splitA` of it is arc A and
   * the rest is arc B.
   */
  splitA: number;
}

/**
 * `from` and `to` are each one closed outline, given as one or more pieces of
 * path data / curves that join up in order (use `reversed` to flip a piece).
 */
export function matchShapes(
  from: Cubic[],
  to: Cubic[],
  base: Pt,
  piecesPerArc = 8,
): Matched {
  const f = outlineOf(from, base);
  const t = outlineOf(to, base);
  const fa = pieces(f.a, piecesPerArc);
  const fb = pieces(f.b, piecesPerArc);
  const ta = pieces(t.a, piecesPerArc);
  const tb = pieces(t.b, piecesPerArc);
  const la = arcLength(fa);
  return {
    from: toPath([...fa, ...fb]),
    to: toPath([...ta, ...tb]),
    splitA: la / (la + arcLength(fb)),
  };
}

/** Bounding box of curves (sampled). */
export function boundsOf(segs: Cubic[]): { x0: number; y0: number; x1: number; y1: number } {
  let [x0, y0, x1, y1] = [Infinity, Infinity, -Infinity, -Infinity];
  for (const c of segs) {
    for (let k = 0; k <= 60; k++) {
      const q = at(c, k / 60);
      x0 = Math.min(x0, q[0]);
      y0 = Math.min(y0, q[1]);
      x1 = Math.max(x1, q[0]);
      y1 = Math.max(y1, q[1]);
    }
  }
  return { x0, y0, x1, y1 };
}

/**
 * Points spaced evenly by arc length along a path (M L H V C Z only), `n + 1` of them with
 * `n = max(8, ceil(length / step))`. Pure geometry: sampling with `getPointAtLength` on a
 * detached <path> costs ~0.6 ms per call on a long path, which froze the page for ~400 ms.
 */
export function samplePath(d: string, step: number): { pts: Pt[]; length: number } {
  const FLAT = 24; // polyline pieces per cubic: error far below a pixel
  const poly: Pt[] = [];
  const cum: number[] = [];
  let total = 0;
  for (const c of parsePath(d)) {
    for (let k = poly.length ? 1 : 0; k <= FLAT; k++) {
      const p = at(c, k / FLAT);
      if (poly.length) total += Math.hypot(p[0] - poly[poly.length - 1][0], p[1] - poly[poly.length - 1][1]);
      poly.push(p);
      cum.push(total);
    }
  }
  const n = Math.max(8, Math.ceil(total / step));
  const pts: Pt[] = [];
  for (let i = 0, j = 0; i <= n; i++) {
    const target = (total * i) / n;
    while (j < cum.length - 2 && cum[j + 1] < target) j++;
    const span = cum[j + 1] - cum[j] || 1;
    const f = Math.min(1, Math.max(0, (target - cum[j]) / span));
    pts.push(lerp(poly[j], poly[j + 1], f));
  }
  return { pts, length: total };
}
