#!/usr/bin/env node
/**
 * Inkscape SVG -> fabricator piece data.
 *
 *   node scripts/svg-to-piece.mjs art/bird.svg [--id bird] [--size 220] [--cx 150] [--cy 150]
 *        [--order "body,eye,leg|feet,tail,wing"] [--flag eye=bg] [--flag pupil=solid]
 *
 * Writes (relative to the repo root):
 *   src/fab/pieces/<id>.strokes.ts   GENERATED every run: fit, strokes, pivots.
 *   src/fab/pieces/<id>.ts           hand-written piece (act lives here) — only
 *                                    created if missing, never overwritten.
 *
 * How the drawing is read (name things in Inkscape: Object Properties > Label,
 * or Objects panel). No dependencies.
 *
 *   order     document order (bottom of the Objects panel draws first). If every
 *             label starts with "NN-" (e.g. "02-body"), that number wins instead.
 *             --order overrides both: comma-separated groups, each one or more
 *             name prefixes joined by "|" ("leg|feet" keeps legs and feet in
 *             document order within the group). Unlisted shapes draw last.
 *   label     first word = stroke id ("wing-l"); the Inkscape id is used when there
 *             is no label. Extra words are flags (or pass --flag name=flag[,flag],
 *             which matches a name or a name prefix like "tail"):
 *               fill     fill it (default: filled iff the shape has a fill in Inkscape)
 *               nofill   outline only, whatever Inkscape says
 *               bg       fill with the page background (implies fill), like the TV screen
 *               solid    fill solid with the draw color (implies fill), e.g. a pupil
 *               scale:0.72  shrink (or grow) the shape about its own center
 *   pivot-X   any circle/ellipse/rect labelled "pivot-shoulder-l" (or just "pivot")
 *             is NOT drawn; its center becomes pivot "shoulder-l" (or "pivot").
 *   poses     "wing-0" plus "wing-100" (any "wing-N") are ONE stroke, "wing": the
 *             laser draws pose 0 and acts can blend toward the others
 *             (flapPoses). Make the second pose by duplicating the path (Ctrl+D)
 *             and transforming the copy — never by editing nodes — so both have
 *             identical node structure; the importer checks this.
 *
 * Group/layer transforms and per-object transforms are applied to the path data, so
 * what you see in Inkscape is what you get. Circles/rects/lines/polygons are
 * converted to paths. The result is fitted to the 300x300 stage via `fit`.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/* ------------------------------------------------------------------ args */
const argv = process.argv.slice(2);
const flags = {}; // --name value (repeatable)
const positional = [];
for (let i = 0; i < argv.length; i++) {
  if (argv[i].startsWith("--")) (flags[argv[i].slice(2)] ??= []).push(argv[++i]);
  else positional.push(argv[i]);
}
const file = positional[0];
const opt = (name, dflt) => flags[name]?.[0] ?? dflt;
if (!file) {
  console.error('usage: node scripts/svg-to-piece.mjs <file.svg> [--id name] [--size 220] [--cx 150] [--cy 150] [--order "a,b|c"] [--flag name=bg]');
  process.exit(1);
}
const id = opt("id", basename(file, ".svg")).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const SIZE = Number(opt("size", 220));
const CX = Number(opt("cx", 150));
const CY = Number(opt("cy", 150));
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const matchesName = (name, key) => name === key || name.startsWith(key + "-");

/* ------------------------------------------------------------- tiny XML */
function parseXml(src) {
  const re = /<!--[\s\S]*?-->|<\?[\s\S]*?\?>|<!\[CDATA\[[\s\S]*?\]\]>|<!DOCTYPE[^>]*>|<(\/?)([\w:.-]+)((?:\s+[\w:.-]+\s*=\s*(?:"[^"]*"|'[^']*'))*)\s*(\/?)>/g;
  const top = { tag: "#root", attrs: {}, children: [] };
  const stack = [top];
  let m;
  while ((m = re.exec(src))) {
    if (!m[2]) continue; // comment / pi / doctype
    const [, closing, tag, attrSrc, selfClose] = m;
    if (closing) {
      if (stack.length > 1) stack.pop();
      continue;
    }
    const attrs = {};
    for (const a of attrSrc.matchAll(/([\w:.-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) attrs[a[1]] = a[2] ?? a[3];
    const node = { tag, attrs, children: [] };
    stack[stack.length - 1].children.push(node);
    if (!selfClose) stack.push(node);
  }
  return top.children.find((n) => n.tag === "svg");
}

const styleOf = (n) => {
  const s = {};
  for (const part of (n.attrs.style ?? "").split(";")) {
    const i = part.indexOf(":");
    if (i > 0) s[part.slice(0, i).trim()] = part.slice(i + 1).trim();
  }
  return s;
};
const prop = (n, k) => styleOf(n)[k] ?? n.attrs[k];

/* ------------------------------------------------------------ transforms */
// matrix = [a,b,c,d,e,f]  (x' = a x + c y + e,  y' = b x + d y + f)
const IDENT = [1, 0, 0, 1, 0, 0];
const mul = (m, n) => [
  m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1],
  m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3],
  m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5],
];
function parseTransform(str) {
  let m = IDENT;
  for (const t of (str ?? "").matchAll(/(\w+)\s*\(([^)]*)\)/g)) {
    const v = t[2].split(/[\s,]+/).filter(Boolean).map(Number);
    const rad = (d) => (d * Math.PI) / 180;
    let n;
    switch (t[1]) {
      case "matrix": n = v; break;
      case "translate": n = [1, 0, 0, 1, v[0], v[1] ?? 0]; break;
      case "scale": n = [v[0], 0, 0, v[1] ?? v[0], 0, 0]; break;
      case "rotate": {
        const c = Math.cos(rad(v[0])), s = Math.sin(rad(v[0]));
        n = [c, s, -s, c, 0, 0];
        if (v.length === 3) n = mul(mul([1, 0, 0, 1, v[1], v[2]], n), [1, 0, 0, 1, -v[1], -v[2]]);
        break;
      }
      case "skewX": n = [1, 0, Math.tan(rad(v[0])), 1, 0, 0]; break;
      case "skewY": n = [1, Math.tan(rad(v[0])), 0, 1, 0, 0]; break;
      default: throw new Error(`unsupported transform "${t[1]}"`);
    }
    m = mul(m, n);
  }
  return m;
}
const apply = (m, x, y) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
const isTranslateOnly = (m) => Math.abs(m[0] - 1) + Math.abs(m[1]) + Math.abs(m[2]) + Math.abs(m[3] - 1) < 1e-9;

/* ------------------------------------------------------------- path data */
const ARGS = { M: 2, L: 2, H: 1, V: 1, C: 6, S: 4, Q: 4, T: 2, A: 7, Z: 0 };
/** d string -> absolute segments: M L C Q A Z (H/V -> L, S -> C, T -> Q). */
function parsePath(d) {
  const segs = [];
  let i = 0, cmd = null, cx = 0, cy = 0, sx = 0, sy = 0, lastC = null, lastQ = null;
  const skip = () => { while (i < d.length && /[\s,]/.test(d[i])) i++; };
  const num = () => {
    skip();
    const r = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/.exec(d.slice(i));
    if (!r) throw new Error(`bad path data near "${d.slice(i, i + 12)}"`);
    i += r[0].length;
    return parseFloat(r[0]);
  };
  const flag = () => { skip(); const f = d[i++]; if (f !== "0" && f !== "1") throw new Error("bad arc flag"); return +f; };
  while (true) {
    skip();
    if (i >= d.length) break;
    if (/[a-zA-Z]/.test(d[i])) cmd = d[i++];
    else if (cmd === null) throw new Error("path must start with a command");
    else if (cmd === "M") cmd = "L"; // implicit lineto after moveto
    else if (cmd === "m") cmd = "l";
    const up = cmd.toUpperCase(), rel = cmd !== up;
    if (up === "Z") { segs.push(["Z"]); cx = sx; cy = sy; lastC = lastQ = null; continue; }
    const a = Array.from({ length: ARGS[up] }, (_, k) => (up === "A" && (k === 3 || k === 4) ? flag() : num()));
    const ox = rel ? cx : 0, oy = rel ? cy : 0;
    let nc = null, nq = null;
    switch (up) {
      case "M": cx = a[0] + ox; cy = a[1] + oy; sx = cx; sy = cy; segs.push(["M", cx, cy]); break;
      case "L": cx = a[0] + ox; cy = a[1] + oy; segs.push(["L", cx, cy]); break;
      case "H": cx = a[0] + ox; segs.push(["L", cx, cy]); break;
      case "V": cy = a[0] + oy; segs.push(["L", cx, cy]); break;
      case "C": {
        const s = ["C", a[0] + ox, a[1] + oy, a[2] + ox, a[3] + oy, a[4] + ox, a[5] + oy];
        segs.push(s); nc = [s[3], s[4]]; cx = s[5]; cy = s[6]; break;
      }
      case "S": {
        const r = lastC ? [2 * cx - lastC[0], 2 * cy - lastC[1]] : [cx, cy];
        const s = ["C", r[0], r[1], a[0] + ox, a[1] + oy, a[2] + ox, a[3] + oy];
        segs.push(s); nc = [s[3], s[4]]; cx = s[5]; cy = s[6]; break;
      }
      case "Q": {
        const s = ["Q", a[0] + ox, a[1] + oy, a[2] + ox, a[3] + oy];
        segs.push(s); nq = [s[1], s[2]]; cx = s[3]; cy = s[4]; break;
      }
      case "T": {
        const r = lastQ ? [2 * cx - lastQ[0], 2 * cy - lastQ[1]] : [cx, cy];
        const s = ["Q", r[0], r[1], a[0] + ox, a[1] + oy];
        segs.push(s); nq = r; cx = s[3]; cy = s[4]; break;
      }
      case "A": segs.push(["A", a[0], a[1], a[2], a[3], a[4], a[5] + ox, a[6] + oy]); cx = a[5] + ox; cy = a[6] + oy; break;
    }
    lastC = nc; lastQ = nq;
  }
  return segs;
}

/** One SVG arc -> cubic segments (standard endpoint->center conversion). */
function arcToCubics(x1, y1, rx, ry, phiDeg, fa, fs, x2, y2) {
  if (rx === 0 || ry === 0) return [["L", x2, y2]];
  rx = Math.abs(rx); ry = Math.abs(ry);
  const phi = (phiDeg * Math.PI) / 180, cp = Math.cos(phi), sp = Math.sin(phi);
  const dx = (x1 - x2) / 2, dy = (y1 - y2) / 2;
  const x1p = cp * dx + sp * dy, y1p = -sp * dx + cp * dy;
  const lam = (x1p * x1p) / (rx * rx) + (y1p * y1p) / (ry * ry);
  if (lam > 1) { rx *= Math.sqrt(lam); ry *= Math.sqrt(lam); }
  const num = rx * rx * ry * ry - rx * rx * y1p * y1p - ry * ry * x1p * x1p;
  const den = rx * rx * y1p * y1p + ry * ry * x1p * x1p;
  const co = (fa === fs ? -1 : 1) * Math.sqrt(Math.max(0, num / den));
  const cxp = (co * rx * y1p) / ry, cyp = (-co * ry * x1p) / rx;
  const cx = cp * cxp - sp * cyp + (x1 + x2) / 2, cy = sp * cxp + cp * cyp + (y1 + y2) / 2;
  const ang = (ux, uy, vx, vy) => Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy);
  const th1 = ang(1, 0, (x1p - cxp) / rx, (y1p - cyp) / ry);
  let dth = ang((x1p - cxp) / rx, (y1p - cyp) / ry, (-x1p - cxp) / rx, (-y1p - cyp) / ry);
  if (!fs && dth > 0) dth -= 2 * Math.PI;
  if (fs && dth < 0) dth += 2 * Math.PI;
  const n = Math.max(1, Math.ceil(Math.abs(dth) / (Math.PI / 2) - 1e-9));
  const step = dth / n, k = (4 / 3) * Math.tan(step / 4), out = [];
  const pt = (t) => [cx + rx * Math.cos(t) * cp - ry * Math.sin(t) * sp, cy + rx * Math.cos(t) * sp + ry * Math.sin(t) * cp];
  const dv = (t) => [-rx * Math.sin(t) * cp - ry * Math.cos(t) * sp, -rx * Math.sin(t) * sp + ry * Math.cos(t) * cp];
  for (let j = 0; j < n; j++) {
    const a = th1 + j * step, b = a + step, p0 = pt(a), p1 = pt(b), d0 = dv(a), d1 = dv(b);
    out.push(["C", p0[0] + k * d0[0], p0[1] + k * d0[1], p1[0] - k * d1[0], p1[1] - k * d1[1], j === n - 1 ? x2 : p1[0], j === n - 1 ? y2 : p1[1]]);
  }
  return out;
}

/** Replace every arc with cubics (needed for non-translate transforms and for bboxes). */
function noArcs(segs) {
  const out = [];
  let cx = 0, cy = 0, sx = 0, sy = 0;
  for (const s of segs) {
    if (s[0] === "A") out.push(...arcToCubics(cx, cy, s[1], s[2], s[3], s[4], s[5], s[6], s[7]));
    else out.push(s);
    if (s[0] === "M") { sx = s[1]; sy = s[2]; }
    if (s[0] === "Z") { cx = sx; cy = sy; } else if (s.length > 1) { cx = s[s.length - 2]; cy = s[s.length - 1]; }
  }
  return out;
}

function transformSegs(segs, m) {
  if (isTranslateOnly(m)) {
    // pure shift: keep arcs as authored
    return segs.map((s) => {
      if (s[0] === "Z") return s;
      if (s[0] === "A") return ["A", s[1], s[2], s[3], s[4], s[5], s[6] + m[4], s[7] + m[5]];
      const o = [s[0]];
      for (let k = 1; k < s.length; k += 2) o.push(s[k] + m[4], s[k + 1] + m[5]);
      return o;
    });
  }
  return noArcs(segs).map((s) => {
    if (s[0] === "Z") return s;
    const o = [s[0]];
    for (let k = 1; k < s.length; k += 2) o.push(...apply(m, s[k], s[k + 1]));
    return o;
  });
}

const r3 = (n) => String(Math.round(n * 1000) / 1000);
const toD = (segs) =>
  segs.map((s) => (s[0] === "A" ? `A${r3(s[1])},${r3(s[2])} ${r3(s[3])} ${s[4]},${s[5]} ${r3(s[6])},${r3(s[7])}` : s[0] === "Z" ? "Z" : s[0] + s.slice(1).map(r3).join(" "))).join(" ");

function bboxOf(segs) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  const add = (x, y) => { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); };
  let cx = 0, cy = 0, sx = 0, sy = 0;
  for (const s of noArcs(segs)) {
    if (s[0] === "M") { cx = sx = s[1]; cy = sy = s[2]; add(cx, cy); }
    else if (s[0] === "L") { cx = s[1]; cy = s[2]; add(cx, cy); }
    else if (s[0] === "Z") { cx = sx; cy = sy; }
    else {
      const pts = [[cx, cy], ...Array.from({ length: (s.length - 1) / 2 }, (_, k) => [s[1 + 2 * k], s[2 + 2 * k]])];
      for (let t = 0; t <= 1; t += 1 / 64) {
        let p = pts; // de Casteljau
        while (p.length > 1) p = p.slice(1).map((q, k) => [p[k][0] + (q[0] - p[k][0]) * t, p[k][1] + (q[1] - p[k][1]) * t]);
        add(p[0][0], p[0][1]);
      }
      cx = s[s.length - 2]; cy = s[s.length - 1];
    }
  }
  return [x0, y0, x1, y1];
}

/* -------------------------------------------------- shapes -> path segs */
const f = (n, k, d = 0) => parseFloat(n.attrs[k] ?? d) || 0;
function shapeSegs(n) {
  switch (n.tag) {
    case "path": return parsePath(n.attrs.d ?? "");
    case "circle": case "ellipse": {
      const rx = n.tag === "circle" ? f(n, "r") : f(n, "rx"), ry = n.tag === "circle" ? rx : f(n, "ry"), cx = f(n, "cx"), cy = f(n, "cy");
      return [["M", cx + rx, cy], ["A", rx, ry, 0, 1, 1, cx - rx, cy], ["A", rx, ry, 0, 1, 1, cx + rx, cy], ["Z"]];
    }
    case "rect": {
      const x = f(n, "x"), y = f(n, "y"), w = f(n, "width"), h = f(n, "height");
      let rx = f(n, "rx", n.attrs.ry ?? 0), ry = f(n, "ry", n.attrs.rx ?? 0);
      rx = Math.min(rx, w / 2); ry = Math.min(ry, h / 2);
      if (!rx || !ry) return [["M", x, y], ["L", x + w, y], ["L", x + w, y + h], ["L", x, y + h], ["Z"]];
      const line = (ok, X, Y) => (ok ? [["L", X, Y]] : []); // skip zero-length edges (pill shapes)
      return [
        ["M", x + rx, y], ...line(w > 2 * rx, x + w - rx, y), ["A", rx, ry, 0, 0, 1, x + w, y + ry],
        ...line(h > 2 * ry, x + w, y + h - ry), ["A", rx, ry, 0, 0, 1, x + w - rx, y + h],
        ...line(w > 2 * rx, x + rx, y + h), ["A", rx, ry, 0, 0, 1, x, y + h - ry],
        ...line(h > 2 * ry, x, y + ry), ["A", rx, ry, 0, 0, 1, x + rx, y], ["Z"],
      ];
    }
    case "line": return [["M", f(n, "x1"), f(n, "y1")], ["L", f(n, "x2"), f(n, "y2")]];
    case "polyline": case "polygon": {
      const v = (n.attrs.points ?? "").trim().split(/[\s,]+/).map(Number);
      const s = [];
      for (let k = 0; k + 1 < v.length; k += 2) s.push([k ? "L" : "M", v[k], v[k + 1]]);
      if (n.tag === "polygon") s.push(["Z"]);
      return s;
    }
    default: return null;
  }
}

/* ----------------------------------------------------------------- walk */
const svg = parseXml(readFileSync(file, "utf8"));
if (!svg) { console.error("no <svg> element found"); process.exit(1); }

const SKIP = new Set(["defs", "metadata", "sodipodi:namedview", "clipPath", "mask", "title", "desc", "style"]);
const items = []; // { label, tag, segs (document space), filled }
const warnings = [];

(function walk(n, parent) {
  if (SKIP.has(n.tag)) return;
  if (prop(n, "display") === "none") return;
  const m = mul(parent, parseTransform(n.attrs.transform));
  if (n.tag === "use") warnings.push("<use> clones are ignored (Edit > Clone > Unlink Clone in Inkscape)");
  const segs = n.tag === "svg" || n.tag === "g" || n.tag === "a" ? null : shapeSegs(n);
  if (segs) {
    const fill = prop(n, "fill");
    items.push({
      label: (n.attrs["inkscape:label"] ?? n.attrs.id ?? n.tag).trim(),
      inkId: n.attrs.id ?? n.tag,
      tag: n.tag,
      segs: transformSegs(segs, m),
      filled: fill !== undefined && fill !== "none",
    });
  }
  for (const c of n.children) walk(c, m);
})(svg, IDENT);

/* ------------------------------------------------------------ interpret */
const isPivot = (it) => /^pivot(-|$)/i.test(it.label);
const pivotItems = items.filter(isPivot);
let drawn = items.filter((it) => !isPivot(it));
if (drawn.length === 0) { console.error("no drawable shapes found"); process.exit(1); }

// first word of the label = name; the rest are flags
for (const it of drawn) {
  const words = it.label.replace(/^\d+-/, "").split(/\s+/).filter(Boolean);
  it.ord = /^\d+-/.test(it.label) ? parseInt(it.label) : null;
  it.name = (words[0] ?? it.inkId).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || it.inkId;
  it.flags = new Set(words.slice(1).map((w) => w.toLowerCase()));
}

// --flag name=bg,solid
for (const spec of flags.flag ?? []) {
  const [key, list = ""] = spec.split("=");
  const hits = drawn.filter((it) => matchesName(it.name, key));
  if (!hits.length) warnings.push(`--flag ${key}: no shape with that name`);
  for (const it of hits) for (const f of list.split(",").filter(Boolean)) it.flags.add(f.toLowerCase());
}

// scale:K flag -> resize a shape about its own center (art tweak, source SVG untouched)
for (const it of drawn) {
  const f = [...it.flags].find((w) => /^scale:[\d.]+$/.test(w));
  if (!f) continue;
  const k = Number(f.slice(6));
  const [x0, y0, x1, y1] = bboxOf(it.segs);
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  it.segs = transformSegs(it.segs, [k, 0, 0, k, cx - k * cx, cy - k * cy]);
}

// "wing-0" + "wing-100" -> one stroke "wing" with poses
const escapeRe = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
for (const it of [...drawn]) {
  const m = /^(.+)-0$/.exec(it.name);
  if (!m) continue;
  const others = drawn.filter((o) => o !== it && new RegExp(`^${escapeRe(m[1])}-\\d+$`).test(o.name));
  if (!others.length) { warnings.push(`"${it.name}" looks like pose 0 but has no "${m[1]}-N" poses; kept as a normal stroke`); continue; }
  it.name = m[1];
  it.poses = others
    .map((o) => ({ at: Number(o.name.slice(m[1].length + 1)), segs: noArcs(o.segs) }))
    .sort((x, y) => x.at - y.at);
  it.segs = noArcs(it.segs);
  const shape = (segs) => segs.map((sg) => sg[0]).join("");
  for (const p of it.poses) {
    if (shape(p.segs) !== shape(it.segs)) {
      console.error(`poses of "${it.name}" have different node structure (pose ${p.at}). Duplicate the path (Ctrl+D) and transform the copy; do not edit its nodes.`);
      process.exit(1);
    }
  }
  drawn = drawn.filter((o) => !others.includes(o));
}

// draw order: --order > "NN-" label prefixes > document order
let ordered = drawn;
if (flags.order) {
  const groups = flags.order[0].split(",").map((g) => g.split("|").map((k) => k.trim()).filter(Boolean));
  const rank = (it) => {
    const i = groups.findIndex((g) => g.some((k) => matchesName(it.name, k)));
    return i < 0 ? groups.length : i;
  };
  ordered = drawn.map((it, i) => ({ it, i })).sort((a, b) => rank(a.it) - rank(b.it) || a.i - b.i).map((x) => x.it);
  const left = ordered.filter((it) => rank(it) === groups.length).map((it) => it.name);
  if (left.length) warnings.push(`not in --order, drawn last: ${left.join(", ")}`);
} else if (drawn.every((it) => it.ord !== null)) {
  ordered = [...drawn].sort((a, b) => a.ord - b.ord);
}

const seen = new Map();
const parsed = ordered.map((it) => {
  let name = it.name;
  const n = (seen.get(name) ?? 0) + 1;
  seen.set(name, n);
  if (n > 1) { warnings.push(`duplicate label "${name}" -> "${name}-${n}"`); name = `${name}-${n}`; }
  const solid = it.flags.has("solid");
  const bg = it.flags.has("bg");
  const fill = it.flags.has("nofill") ? false : it.flags.has("fill") || bg || solid ? true : it.filled;
  const subpaths = it.segs.filter((s) => s[0] === "M").length;
  if (subpaths > 1) warnings.push(`"${name}" has ${subpaths} subpaths; the laser will jump between them (split it in Inkscape: Path > Break Apart)`);
  return { name, fill, bg, solid, segs: it.segs, poses: it.poses };
});

/* ------------------------------------------------------------------ fit */
let [bx0, by0, bx1, by1] = [Infinity, Infinity, -Infinity, -Infinity];
for (const p of parsed) {
  for (const segs of [p.segs, ...(p.poses ?? []).map((q) => q.segs)]) {
    const [a, b, c, d] = bboxOf(segs);
    bx0 = Math.min(bx0, a); by0 = Math.min(by0, b); bx1 = Math.max(bx1, c); by1 = Math.max(by1, d);
  }
}
const bw = bx1 - bx0, bh = by1 - by0;
const scale = SIZE / Math.max(bw, bh);
const fit = { x: +(CX - (bx0 + bw / 2) * scale).toFixed(3), y: +(CY - (by0 + bh / 2) * scale).toFixed(3), scale: +scale.toFixed(5) };

const pivots = {};
for (const it of pivotItems) {
  const [a, b, c, d] = bboxOf(it.segs);
  pivots[it.label.replace(/^pivot-?/i, "").toLowerCase() || "pivot"] = [+((a + c) / 2).toFixed(2), +((b + d) / 2).toFixed(2)];
}

/* ---------------------------------------------------------------- write */
const camel = id.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase());
const dir = join(root, "src/fab/pieces");
mkdirSync(dir, { recursive: true });
const lit = (s) => JSON.stringify(s);
const strokeLines = parsed.map((p) => {
  const bits = [`id: ${lit(p.name)}`, `d: ${lit(toD(p.segs))}`];
  if (p.fill) bits.push("fill: true");
  if (p.bg) bits.push(`fillColor: ${lit("var(--background)")}`);
  else if (p.solid) bits.push(`fillColor: ${lit("currentColor")}`);
  if (p.poses) bits.push(`poses: [${p.poses.map((q) => `{ at: ${q.at}, d: ${lit(toD(q.segs))} }`).join(", ")}]`);
  return `  { ${bits.join(", ")} },`;
});
const quote = (a) => (/^[\w./=:-]+$/.test(a) ? a : `"${a}"`);
const command = ["node scripts/svg-to-piece.mjs", ...argv.map(quote)].join(" ");
const generated = `// GENERATED — do not edit. Regenerate with:
//   ${command}
// Redraw in Inkscape and re-run; the hand-written ./${id}.ts is never touched.
import type { FabStroke, Fit } from "../types";

export const fit: Fit = ${JSON.stringify(fit).replace(/"(\w+)":/g, "$1: ").replace(/,/g, ", ").replace(/\{/, "{ ").replace(/\}/, " }")};

export const strokes: FabStroke[] = [
${strokeLines.join("\n")}
];

export const pivots: Record<string, [number, number]> = ${JSON.stringify(pivots)};
`;
writeFileSync(join(dir, `${id}.strokes.ts`), generated);

const stubPath = join(dir, `${id}.ts`);
let stub = "kept (already exists)";
if (!existsSync(stubPath)) {
  writeFileSync(stubPath, `import type { Piece } from "../types";
import { fit, strokes, pivots } from "./${id}.strokes";

/** Everything that moves after the drawing exists goes in \`act\`. */
export const ${camel}: Piece = {
  id: "${id}",
  fit,
  strokes,
  pivots,
  holdMs: 1500,
  // async act(s) {
  //   // see src/fab/acts.ts, e.g. await flap(s, [{ id: "wing-l", pivot: "shoulder-l" }, { id: "wing-r", pivot: "shoulder-r" }]);
  // },
};
`);
  stub = "created";
}

console.log(`\n${id}: ${parsed.length} strokes, ${Object.keys(pivots).length} pivots`);
for (const p of parsed) console.log(`  ${p.name.padEnd(18)} ${p.fill ? (p.bg ? "fill (background)" : p.solid ? "fill (solid)" : "fill") : "outline"}${p.poses ? `  poses 0, ${p.poses.map((q) => q.at).join(", ")}` : ""}`);
for (const [k, v] of Object.entries(pivots)) console.log(`  pivot ${k.padEnd(12)} ${v.join(", ")}`);
console.log(`source bbox ${r3(bw)} x ${r3(bh)} -> fit ${JSON.stringify(fit)}`);
console.log(`wrote src/fab/pieces/${id}.strokes.ts; src/fab/pieces/${id}.ts ${stub}`);
for (const w of [...new Set(warnings)]) console.log(`  warning: ${w}`);
console.log(`\nnext: add \`import { ${camel} } from "./${id}";\` and ${camel} to src/fab/pieces/index.ts`);
