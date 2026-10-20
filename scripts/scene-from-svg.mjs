#!/usr/bin/env node
/**
 * art/scene-1.svg  ->  src/fab/pieces/scene.strokes.ts
 *
 *   pnpm fab:scene [art/scene-1.svg]
 *
 * Reads the whole-scene drawing and writes the geometry the camera chapter
 * (src/fab/pieces/scene.ts) needs. Everything is in the scene's own world
 * coordinates (the SVG's user units), so the chapter places pieces with plain
 * translations and the camera works in the same units.
 *
 * Group transforms (the leaves sit under rotate()/matrix()) are baked into the
 * path data: a piece's `fit` can only translate and scale. Circles and ellipses
 * are turned into paths. Arcs become cubic curves.
 *
 * What it looks for, by element id:
 *   path5, path9            the ground (hill top, then the ground to the left)
 *   puddle                  the puddle line
 *   path6                   the stem (drawn from its first point: the foot)
 *   rect7 path8 | path11 path12   leaf outline + vein, lower leaf first
 *   sun                     circle: centre and radius only
 *   bird-rough-fly-path     the path the bird follows
 *   body, pivot             the bird: where its own space sits in the world,
 *                           and where the wing hinge is
 *   path4                   the flower's reference point (see FLOWER_REF)
 *
 * NOT imported, on purpose: the flower's own paths (path1, 2, 4, 7, 14-20, 22,
 * 23). src/fab/pieces/flower.ts owns them; path4 is only *measured* to know
 * where the flower stands in this drawing.
 */
import { readFileSync, writeFileSync } from "node:fs";

const src = process.argv[2] ?? "art/scene-1.svg";
const OUT = "src/fab/pieces/scene.strokes.ts";

/** First point of `path4` in the flower's own coordinates (art/scene.svg of the flower pass). */
const FLOWER_REF = [165.31599, 6.4316138];

// ---------------------------------------------------------------- matrices
const I = [1, 0, 0, 1, 0, 0];
const mul = (a, b) => [
  a[0] * b[0] + a[2] * b[1],
  a[1] * b[0] + a[3] * b[1],
  a[0] * b[2] + a[2] * b[3],
  a[1] * b[2] + a[3] * b[3],
  a[0] * b[4] + a[2] * b[5] + a[4],
  a[1] * b[4] + a[3] * b[5] + a[5],
];
const apply = (m, x, y) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];

function parseTransform(t) {
  let m = I;
  for (const [, fn, args] of (t ?? "").matchAll(/(\w+)\s*\(([^)]*)\)/g)) {
    const n = args.split(/[\s,]+/).filter(Boolean).map(Number);
    let k = I;
    if (fn === "translate") k = [1, 0, 0, 1, n[0], n[1] ?? 0];
    else if (fn === "scale") k = [n[0], 0, 0, n[1] ?? n[0], 0, 0];
    else if (fn === "matrix") k = n;
    else if (fn === "rotate") {
      const r = (n[0] * Math.PI) / 180;
      const c = Math.cos(r);
      const s = Math.sin(r);
      k = [c, s, -s, c, 0, 0];
      if (n.length === 3) k = mul(mul([1, 0, 0, 1, n[1], n[2]], k), [1, 0, 0, 1, -n[1], -n[2]]);
    } else if (fn === "skewX") k = [1, 0, Math.tan((n[0] * Math.PI) / 180), 1, 0, 0];
    else if (fn === "skewY") k = [1, Math.tan((n[0] * Math.PI) / 180), 0, 1, 0, 0];
    m = mul(m, k);
  }
  return m;
}

// ------------------------------------------------------------------- paths
/** Elliptical arc -> cubic curves (SVG implementation notes, F.6). */
function arcToCubics(x1, y1, rx, ry, phi, fa, fs, x2, y2) {
  if (rx === 0 || ry === 0) return [["L", x2, y2]];
  const p = (phi * Math.PI) / 180;
  const cp = Math.cos(p);
  const sp = Math.sin(p);
  const dx = (x1 - x2) / 2;
  const dy = (y1 - y2) / 2;
  const x1p = cp * dx + sp * dy;
  const y1p = -sp * dx + cp * dy;
  rx = Math.abs(rx);
  ry = Math.abs(ry);
  const lam = (x1p * x1p) / (rx * rx) + (y1p * y1p) / (ry * ry);
  if (lam > 1) {
    rx *= Math.sqrt(lam);
    ry *= Math.sqrt(lam);
  }
  const num = rx * rx * ry * ry - rx * rx * y1p * y1p - ry * ry * x1p * x1p;
  const den = rx * rx * y1p * y1p + ry * ry * x1p * x1p;
  const co = (fa === fs ? -1 : 1) * Math.sqrt(Math.max(0, num / den));
  const cxp = (co * rx * y1p) / ry;
  const cyp = (-co * ry * x1p) / rx;
  const cx = cp * cxp - sp * cyp + (x1 + x2) / 2;
  const cy = sp * cxp + cp * cyp + (y1 + y2) / 2;
  const ang = (ux, uy, vx, vy) => {
    const a = Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy);
    return a;
  };
  let t1 = ang(1, 0, (x1p - cxp) / rx, (y1p - cyp) / ry);
  let dt = ang((x1p - cxp) / rx, (y1p - cyp) / ry, (-x1p - cxp) / rx, (-y1p - cyp) / ry);
  if (!fs && dt > 0) dt -= 2 * Math.PI;
  if (fs && dt < 0) dt += 2 * Math.PI;
  const n = Math.max(1, Math.ceil(Math.abs(dt) / (Math.PI / 2) - 1e-9));
  const step = dt / n;
  const k = (4 / 3) * Math.tan(step / 4);
  const out = [];
  const pt = (t) => [
    cx + rx * Math.cos(t) * cp - ry * Math.sin(t) * sp,
    cy + rx * Math.cos(t) * sp + ry * Math.sin(t) * cp,
  ];
  const dv = (t) => [
    -rx * Math.sin(t) * cp - ry * Math.cos(t) * sp,
    -rx * Math.sin(t) * sp + ry * Math.cos(t) * cp,
  ];
  for (let i = 0; i < n; i++) {
    const a = t1 + i * step;
    const b = a + step;
    const [ax, ay] = pt(a);
    const [bx, by] = pt(b);
    const [dax, day] = dv(a);
    const [dbx, dby] = dv(b);
    out.push(["C", ax + k * dax, ay + k * day, bx - k * dbx, by - k * dby, i === n - 1 ? x2 : bx, i === n - 1 ? y2 : by]);
  }
  return out;
}

/** Path data -> absolute segments M/L/C/Z (arcs, quadratics, H/V all expanded). */
function parsePath(d) {
  const toks = d.match(/[a-zA-Z]|[-+]?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/gi) ?? [];
  const segs = [];
  let i = 0;
  let cmd = "";
  let x = 0;
  let y = 0;
  let sx = 0;
  let sy = 0;
  let lastC = null; // previous cubic's second control point (for S)
  let lastQ = null;
  const num = () => Number(toks[i++]);
  const flag = () => {
    // arc flags may be glued to the next number ("a1 1 0 01.5 2")
    const t = toks[i];
    if (t.length > 1 && /^[01]/.test(t)) {
      toks[i] = t.slice(1);
      return Number(t[0]);
    }
    i++;
    return Number(t);
  };
  while (i < toks.length) {
    if (/[a-zA-Z]/.test(toks[i])) cmd = toks[i++];
    else if (cmd === "M") cmd = "L";
    else if (cmd === "m") cmd = "l";
    const rel = cmd === cmd.toLowerCase();
    const C = cmd.toUpperCase();
    const ox = rel ? x : 0;
    const oy = rel ? y : 0;
    let nextC = null;
    let nextQ = null;
    if (C === "M") {
      x = ox + num();
      y = oy + num();
      sx = x;
      sy = y;
      segs.push(["M", x, y]);
    } else if (C === "L") {
      x = ox + num();
      y = oy + num();
      segs.push(["L", x, y]);
    } else if (C === "H") {
      x = (rel ? x : 0) + num();
      segs.push(["L", x, y]);
    } else if (C === "V") {
      y = (rel ? y : 0) + num();
      segs.push(["L", x, y]);
    } else if (C === "C") {
      const a = [ox + num(), oy + num(), ox + num(), oy + num(), ox + num(), oy + num()];
      segs.push(["C", ...a]);
      nextC = [a[2], a[3]];
      x = a[4];
      y = a[5];
    } else if (C === "S") {
      const c1 = lastC ? [2 * x - lastC[0], 2 * y - lastC[1]] : [x, y];
      const a = [ox + num(), oy + num(), ox + num(), oy + num()];
      segs.push(["C", c1[0], c1[1], ...a]);
      nextC = [a[0], a[1]];
      x = a[2];
      y = a[3];
    } else if (C === "Q" || C === "T") {
      let q;
      if (C === "Q") q = [ox + num(), oy + num()];
      else q = lastQ ? [2 * x - lastQ[0], 2 * y - lastQ[1]] : [x, y];
      const e = [ox + num(), oy + num()];
      segs.push([
        "C",
        x + (2 / 3) * (q[0] - x),
        y + (2 / 3) * (q[1] - y),
        e[0] + (2 / 3) * (q[0] - e[0]),
        e[1] + (2 / 3) * (q[1] - e[1]),
        e[0],
        e[1],
      ]);
      nextQ = q;
      x = e[0];
      y = e[1];
    } else if (C === "A") {
      const rx = num();
      const ry = num();
      const rot = num();
      const fa = flag();
      const fs = flag();
      const ex = ox + num();
      const ey = oy + num();
      segs.push(...arcToCubics(x, y, rx, ry, rot, fa, fs, ex, ey));
      x = ex;
      y = ey;
    } else if (C === "Z") {
      segs.push(["Z"]);
      x = sx;
      y = sy;
    } else throw new Error(`unsupported path command ${cmd}`);
    lastC = nextC;
    lastQ = nextQ;
  }
  return segs;
}

const r3 = (n) => String(Math.round(n * 1000) / 1000);
function emit(segs, m) {
  return segs
    .map(([c, ...n]) => {
      if (c === "Z") return "Z";
      const out = [];
      for (let k = 0; k < n.length; k += 2) out.push(...apply(m, n[k], n[k + 1]).map(r3));
      return `${c}${out.join(" ")}`;
    })
    .join(" ");
}

// -------------------------------------------------------------------- XML
const xml = readFileSync(src, "utf8").replace(/<!--[\s\S]*?-->/g, "");
const elements = new Map(); // id -> { tag, attrs, m }
{
  const stack = [I];
  for (const [full] of xml.matchAll(/<\/?[a-zA-Z][^>]*>/g)) {
    if (full.startsWith("</")) {
      stack.pop();
      continue;
    }
    const tag = full.match(/^<([\w:-]+)/)[1];
    const attrs = {};
    for (const [, k, v] of full.matchAll(/([\w:-]+)="([^"]*)"/g)) attrs[k] = v;
    const m = mul(stack[stack.length - 1], parseTransform(attrs.transform));
    if (attrs.id) elements.set(attrs.id, { tag, attrs, m, own: parseTransform(attrs.transform) });
    if (!full.endsWith("/>")) stack.push(m);
  }
}
const get = (id) => {
  const e = elements.get(id);
  if (!e) throw new Error(`${src}: no element with id "${id}"`);
  return e;
};

/** Element -> absolute path data in world coordinates. */
const worldPath = (id) => {
  const e = get(id);
  return emit(parsePath(e.attrs.d), e.m);
};
/** Same, but the shape is closed (ends where it starts, or has a Z). */
const isClosed = (id) => /z\s*$/i.test(get(id).attrs.d.trim());

// ------------------------------------------------------------------ puddle
/** Path segments (M/L/C/Z, absolute) -> a polyline, curves sampled densely. */
function flatten(segs, m) {
  const pts = [];
  let [x, y] = [0, 0];
  for (const [c, ...n] of segs) {
    if (c === "M" || c === "L") {
      [x, y] = [n[0], n[1]];
      pts.push(apply(m, x, y));
    } else if (c === "C") {
      const [x0, y0] = [x, y];
      for (let i = 1; i <= 24; i++) {
        const t = i / 24;
        const u = 1 - t;
        const px = u * u * u * x0 + 3 * u * u * t * n[0] + 3 * u * t * t * n[2] + t * t * t * n[4];
        const py = u * u * u * y0 + 3 * u * u * t * n[1] + 3 * u * t * t * n[3] + t * t * t * n[5];
        pts.push(apply(m, px, py));
      }
      [x, y] = [n[4], n[5]];
    }
  }
  return pts;
}

/**
 * The water: the area between the puddle's line and the ground below it. Found by walking
 * the ground until it dips under the line and comes back up, and closing the shape along
 * the line.
 */
function puddleFill(puddleId, groundId) {
  const line = parsePath(get(puddleId).attrs.d);
  const [, , py] = line[0];
  const g = get(groundId);
  const pts = flatten(parsePath(g.attrs.d), g.m);
  const cross = [];
  const level = py + 1e-4; // the ground may pass exactly through the line's end: nudge so it still counts as a crossing
  for (let i = 0; i + 1 < pts.length; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    if ((a[1] - level) * (b[1] - level) < 0) {
      const t = (level - a[1]) / (b[1] - a[1]);
      cross.push({ i, p: [a[0] + (b[0] - a[0]) * t, py] });
    }
  }
  if (cross.length < 2) throw new Error(`${groundId} never dips below the puddle line`);
  const [c1, c2] = cross; // down into the pit, then back up
  const poly = [c1.p, ...pts.slice(c1.i + 1, c2.i + 1), c2.p];
  return "M" + poly.map((p) => `${r3(p[0])} ${r3(p[1])}`).join(" L") + " Z";
}

// ----------------------------------------------------------------- output
const first = (d) => d.match(/^M([-\d.]+) ([-\d.]+)/).slice(1).map(Number);

const sun = get("sun");
const [sunX, sunY] = apply(sun.m, Number(sun.attrs.cx), Number(sun.attrs.cy));
const sunR = Number(sun.attrs.r) * Math.sqrt(Math.abs(sun.m[0] * sun.m[3] - sun.m[1] * sun.m[2]));

// the bird's own space (what bird.strokes.ts is drawn in) = the transform of its body's parent
const body = get("body");
const [birdX, birdY] = apply(body.m, 0, 0);

const pivot = get("pivot");
const [pivX, pivY] = apply(pivot.m, Number(pivot.attrs.cx), Number(pivot.attrs.cy));

const [p4x, p4y] = first(worldPath("path4"));

const leaf = (n, outline, vein) => [
  { id: `leaf-${n}`, d: worldPath(outline), fill: isClosed(outline) },
  { id: `leaf-${n}-vein`, d: worldPath(vein) },
];

const strokes = (list) =>
  "[\n" +
  list
    .map(
      (s) =>
        `  { id: ${JSON.stringify(s.id)}, d: ${JSON.stringify(s.d)}${s.fill ? ", fill: true" : ""}${s.outline === false ? ", outline: false" : ""} },`,
    )
    .join("\n") +
  "\n]";

const ts = `// GENERATED — do not edit. Regenerate with:
//   node scripts/scene-from-svg.mjs ${src}
// Everything is in the scene's own world coordinates (the SVG's user units).
// The flower's paths are never read from the drawing (src/fab/pieces/flower.ts owns them);
// only path4's first point is measured, to know where the flower stands.
import type { FabStroke, Point } from "../types";

/** The ground: the hill top and the cliff, then the ground that runs off to the left. */
export const groundStrokes: FabStroke[] = ${strokes([
  { id: "ground-hill", d: worldPath("path5") },
  { id: "ground-left", d: worldPath("path9") },
])};

/** The water (a fill with no outline: the area under the line, down to the ground), then its line. */
export const puddleStrokes: FabStroke[] = ${strokes([
  { id: "puddle-fill", d: puddleFill("puddle", "path5"), fill: true, outline: false },
  { id: "puddle", d: worldPath("puddle") },
])};

/** Stem (drawn from its foot upward), then each leaf: outline, vein. */
export const plantStrokes: FabStroke[] = ${strokes([
  { id: "stem", d: worldPath("path6") },
  ...leaf(1, "rect7", "path8"),
  ...leaf(2, "path11", "path12"),
])};

/** The sun's disc. */
export const sunDisc = { x: ${r3(sunX)}, y: ${r3(sunY)}, r: ${r3(sunR)} };

/** Where the bird's own coordinate space (bird.strokes.ts) sits in the world. */
export const birdOrigin: Point = { x: ${r3(birdX)}, y: ${r3(birdY)} };

/** The wing hinge in the world: the point the bird's flight tracks. */
export const birdPivot: Point = { x: ${r3(pivX)}, y: ${r3(pivY)} };

/** The rough path the bird follows (world coordinates). */
export const flyPath = ${JSON.stringify(worldPath("bird-rough-fly-path"))};

/** Add this to the flower's own coordinates (flower.ts) to get world coordinates. */
export const flowerOffset: Point = { x: ${r3(p4x - FLOWER_REF[0])}, y: ${r3(p4y - FLOWER_REF[1])} };
`;
writeFileSync(OUT, ts);
console.log(`wrote ${OUT}`);
console.log(`  flower offset ${r3(p4x - FLOWER_REF[0])}, ${r3(p4y - FLOWER_REF[1])}   bird origin ${r3(birdX)}, ${r3(birdY)}`);
