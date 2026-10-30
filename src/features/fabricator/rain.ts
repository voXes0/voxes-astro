import { samplePath } from "./morph";
import { abortError, frameNow, nextFrame } from "./timing";
import type { Point } from "./types";
import { CONFIG, SVG_NS as NS } from "./config";
import { clamp01, smooth } from "./util";

/**
 * Rain that is generated, not drawn.
 *
 *   - A `Surface` is what a drop can land on: a silhouette from real path data (petals, leaves, hill).
 *     A drop falls straight down and stops at the first surface under its column.
 *   - A `Spring` is a body a drop can knock (a petal or leaf, hinged at its base): an underdamped
 *     torsion spring, so a drop landing while it still rings adds to its motion.
 *   - Each landing throws droplets on ballistic arcs, and on the ground a flat ripple arc.
 *
 * Everything lives in one SVG group, runs from one frame loop and is removed by `stop()`. Time is
 * stretched for the eye, but the ratios hold: a drop outruns every droplet, a petal rings several times a second.
 */

/** Droplet gravity, world units per second squared (the splashes' scale). */
const GRAVITY = 320;

// ── surfaces ──

export interface Surface {
  id: string;
  kind: "petal" | "leaf" | "ground";
  /** The silhouette, densely sampled, in world coordinates. */
  pts: Point[];
  /** What gets knocked when a drop lands here (petals and leaves). */
  body?: Spring;
  /** Bodies that carry this surface and are knocked by the same drops (the stem a petal grows on). */
  also?: Spring[];
  /**
   * Where a point of the surface (after `body` has turned it) really is once what carries it has
   * moved: the leaning stem. `carryTurn` is how far that turns it (radians). Both default to nothing.
   */
  carry?: (p: Point) => Point;
  carryTurn?: () => number;
}

/** Where a point fixed to the surface (given at rest) is now: turned by its own body, then carried. */
export function placeOn(s: Surface, p: Point): Point {
  let q = p;
  const b = s.body;
  if (b && b.theta !== 0) {
    const c = Math.cos(b.theta);
    const sn = Math.sin(b.theta);
    const rx = p.x - b.pivot.x;
    const ry = p.y - b.pivot.y;
    q = { x: b.pivot.x + rx * c - ry * sn, y: b.pivot.y + rx * sn + ry * c };
  }
  return s.carry ? s.carry(q) : q;
}

/** How far the surface is turned now, radians (its own body and what carries it). */
export function turnOf(s: Surface): number {
  return (s.body?.theta ?? 0) + (s.carryTurn?.() ?? 0);
}

export interface Hit {
  /** Where the drop touches the surface (world). */
  y: number;
  /** Unit normal of the surface there, pointing up and out of it. */
  nx: number;
  ny: number;
  surface: Surface;
}

/** Sample a path's outline into points, shifted by `offset`. */
export function outlineOf(d: string, offset: Point = { x: 0, y: 0 }, step = 0.3): Point[] {
  return samplePath(d, step).pts.map(([x, y]) => ({ x: x + offset.x, y: y + offset.y }));
}

export function extentOf(pts: Point[]) {
  let [x0, y0, x1, y1] = [Infinity, Infinity, -Infinity, -Infinity];
  for (const p of pts) {
    x0 = Math.min(x0, p.x);
    y0 = Math.min(y0, p.y);
    x1 = Math.max(x1, p.x);
    y1 = Math.max(y1, p.y);
  }
  return { x0, y0, x1, y1, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 };
}

/** Segment indices per 2-unit column, so a lookup scans a handful of segments, not the whole outline. */
const CELL = 2;
const columns = new WeakMap<Surface, Map<number, number[]>>();
function columnsOf(s: Surface) {
  let m = columns.get(s);
  if (!m) {
    m = new Map();
    for (let i = 0; i < s.pts.length - 1; i++) {
      const a = s.pts[i].x;
      const b = s.pts[i + 1].x;
      for (let c = Math.floor(Math.min(a, b) / CELL); c <= Math.floor(Math.max(a, b) / CELL); c++) {
        const list = m.get(c);
        if (list) list.push(i);
        else m.set(c, [i]);
      }
    }
    columns.set(s, m);
  }
  return m;
}

/** The topmost point of a surface on the vertical line `x`, with its normal; null if x misses it. */
function topAt(s: Surface, x: number): Omit<Hit, "surface"> | null {
  let best: Omit<Hit, "surface"> | null = null;
  const pts = s.pts;
  for (const i of columnsOf(s).get(Math.floor(x / CELL)) ?? []) {
    const a = pts[i];
    const b = pts[i + 1];
    if ((a.x - x) * (b.x - x) > 0 || Math.abs(b.x - a.x) < 1e-9) continue;
    const t = (x - a.x) / (b.x - a.x);
    const y = a.y + t * (b.y - a.y);
    if (best && y >= best.y) continue;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy) || 1;
    let nx = dy / len;
    let ny = -dx / len;
    if (ny > 0) {
      nx = -nx;
      ny = -ny;
    }
    // a near-vertical edge would send everything sideways: keep the splash leaning upward
    if (ny > -0.3) {
      ny = -0.3;
      const k = Math.sqrt(1 - ny * ny) / (Math.abs(nx) || 1);
      nx *= k;
    }
    best = { y, nx, ny };
  }
  return best;
}

export function surfaceAt(surfaces: Surface[], x: number): Hit | null {
  let best: Hit | null = null;
  for (const s of surfaces) {
    const h = topAt(s, x);
    if (h && (!best || h.y < best.y)) best = { ...h, surface: s };
  }
  return best;
}

// ── springs ──

export interface SpringOptions {
  /** The groups that turn together (a leaf and its vein). */
  targets: Element[];
  /** The hinge, in world coordinates (for the torque)... */
  pivot: Point;
  /** ...and in the targets' own coordinate space (for the transform). */
  pivotLocal: Point;
  /** Distance from the hinge to the farthest point of the body (world units): sets how heavy it is to turn. */
  reach: number;
  /** Ringing frequency (Hz) and damping ratio (0.2 rings a few times; 1 would not ring at all). */
  freqHz: number;
  zeta: number;
  /** How hard a drop knocks it: ~0.3 turns a petal about 6 degrees at the first dip. */
  gain?: number;
  /** The most it can turn, in degrees (either way). */
  maxDeg?: number;
  /**
   * A transform that goes outside its own turn (what carries it has moved): written in front of
   * the rotate, so the body turns first and is then carried. Read every frame.
   */
  carry?: () => string;
}

export interface Spring {
  /** Current turn, radians (positive = clockwise on screen). */
  readonly theta: number;
  readonly pivot: Point;
  /** A drop of relative size `mass` lands at world point `at`, moving along `dir` at `speed` (world units/s). */
  kick(at: Point, normal: Point, speed: number, mass: number): void;
  step(dt: number): void;
  /**
   * Where it settles (radians): a weight resting on it (a bead of water) holds it a little
   * turned. Moving this does not jerk it; it rings out to the new rest like anything else.
   */
  setRest(theta: number): void;
  /** Put it back, exactly. */
  reset(): void;
}

export function createSpring(o: SpringOptions): Spring {
  const w0 = 2 * Math.PI * o.freqHz;
  const k = w0 * w0;
  const c = 2 * o.zeta * w0;
  const gain = o.gain ?? 0.3;
  const maxTheta = ((o.maxDeg ?? 14) * Math.PI) / 180;
  let theta = 0;
  let omega = 0;
  let rest = 0;
  let shown = 0;
  let shownCarry = "";

  const apply = () => {
    // nothing is written for a body at rest, so the group is exactly as the engine made it
    const value = Math.abs(theta) < 1e-5 && Math.abs(omega) < 1e-3 && rest === 0 ? 0 : theta;
    const carry = o.carry?.() ?? "";
    if (value === shown && carry === shownCarry) return;
    shown = value;
    shownCarry = carry;
    const turn = value === 0 ? "" : `rotate(${((value * 180) / Math.PI).toFixed(3)} ${o.pivotLocal.x} ${o.pivotLocal.y})`;
    const t = `${carry} ${turn}`.trim();
    for (const el of o.targets) {
      if (t) el.setAttribute("transform", t);
      else el.removeAttribute("transform");
    }
  };

  return {
    get theta() {
      return theta;
    },
    pivot: o.pivot,
    kick(at, n, speed, mass) {
      // Momentum handed over: the part of the drop's velocity that goes into the surface,
      // along the surface's normal (a drop on a slope pushes it sideways too).
      const inN = { x: -n.x, y: -n.y };
      const vn = speed * inN.y; // v = (0, speed), y down
      if (vn <= 0) return;
      const jx = mass * vn * inN.x;
      const jy = mass * vn * inN.y;
      const rx = at.x - o.pivot.x;
      const ry = at.y - o.pivot.y;
      const torque = rx * jy - ry * jx; // z of r x J, y down: positive turns clockwise
      omega += (gain * torque) / (o.reach * o.reach);
    },
    step(dt) {
      const n = Math.max(1, Math.ceil(dt / (1 / 240)));
      const h = dt / n;
      for (let i = 0; i < n; i++) {
        omega += (-k * (theta - rest) - c * omega) * h; // semi-implicit Euler: stable for these stiffnesses
        theta += omega * h;
      }
      if (Math.abs(theta) > maxTheta) {
        theta = Math.sign(theta) * maxTheta;
        if (theta * omega > 0) omega = 0; // against the stop
      }
      if (rest === 0 && Math.abs(theta) < 1e-5 && Math.abs(omega) < 1e-3) theta = omega = 0;
      apply();
    },
    setRest(r) {
      rest = r;
    },
    reset() {
      theta = omega = rest = 0;
      shown = NaN; // force the write
      apply();
    },
  };
}

// ── rain ──

export interface RainOptions {
  /** The world group to draw into (a layer's `group`, placed at the world's origin). */
  host: SVGGElement;
  signal: AbortSignal;
  /** Stage units per world unit *now* (the camera can zoom): keeps lines as heavy as the rest of the drawing. */
  zoom: () => number;
  /** The cloud's underside: rain falls only between x `from` and `to`, starting at height `y`. */
  from: number;
  to: number;
  y: number;
  surfaces: Surface[];
  seed?: number;
  /** Drops per second once the rain is going full. */
  perSecond?: number;
  /** The rain builds up from nothing over this long. */
  rampMs?: number;
  /** Colour of drops and splashes (any CSS colour). */
  color?: string;
  /** Called every frame after the bodies have moved (redraw whatever follows them, like a bending stem). */
  onStep?: () => void;
}

const RIPPLE_WEIGHT = 0.38;

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Drop {
  el: SVGPathElement;
  /** Line weight on screen, stage units. */
  weight: number;
  x: number;
  head: number; // where the front of the streak would be, unobstructed
  v: number;
  vTerm: number;
  len: number;
  size: number;
  hit: Hit | null;
  landed: boolean;
  /** Called once, as it lands (after the splash and the knock). */
  onLand?: () => void;
}

interface Droplet {
  el: SVGCircleElement;
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  age: number;
  life: number;
  /** Dies when it falls back onto the ground (ground splashes); otherwise it fades while falling. */
  ground: boolean;
}

interface Ripple {
  el: SVGPathElement;
  x: number;
  y: number;
  tilt: number; // degrees
  age: number;
  life: number;
  rx: number;
}

export interface Rain {
  /** Stop for good: everything it made is removed and every body it knocked is put back. */
  stop(): void;
  /** Change how many drops start per second (the rain eases off as drops already falling land). */
  setRate(perSecond: number): void;
  /** Leave surface `id` dry: columns that would land there are skipped (null: rain everywhere again). */
  avoid(id: string | null): void;
  /**
   * A drop of relative `size` lands on `hit` at `speed` as the rain's own do: it knocks the body
   * and throws a splash. For a drop the caller animates itself.
   */
  impact(x: number, hit: Hit, size: number, speed: number): void;
  /**
   * One drop, exactly like the rain's (a streak out of the cloud) but followed by the caller: it falls
   * at column `x`, lands on whatever is under it (knocking it as any drop does, `size` times the
   * ordinary), and the promise resolves at that moment.
   */
  fall(x: number, size: number): Promise<void>;
}

export function startRain(o: RainOptions): Rain {
  const rand = rng(o.seed ?? 11);
  const color = o.color ?? "var(--soft-secondary)";
  const lw = (stage: number) => stage / o.zoom();
  let perSecond = o.perSecond ?? 52;
  let dry: string | null = null;
  const rampMs = o.rampMs ?? 2600;
  const fall = 172; // world units/s for a standard drop (the terminal speed)
  const ground = o.surfaces.filter((s) => s.kind === "ground");

  const g = document.createElementNS(NS, "g");
  g.setAttribute("data-fab-rain", "");
  g.setAttribute("fill", "none");
  g.setAttribute("stroke", color);
  g.setAttribute("stroke-linecap", "round");
  o.host.appendChild(g);

  const drops: Drop[] = [];
  const droplets: Droplet[] = [];
  const ripples: Ripple[] = [];
  const springs = new Set<Spring>();
  for (const s of o.surfaces) {
    if (s.body) springs.add(s.body);
    for (const sp of s.also ?? []) springs.add(sp);
  }

  /** Elements are recycled (hidden, not removed) so a busy shower creates no DOM after the first seconds. */
  const pool = <T extends SVGElement>(tag: string, init?: (el: T) => void) => {
    const free: T[] = [];
    return {
      take(): T {
        let el = free.pop();
        if (!el) {
          el = document.createElementNS(NS, tag) as T;
          init?.(el);
          g.appendChild(el);
        }
        el.style.display = "";
        return el;
      },
      give(el: T) {
        el.style.display = "none";
        free.push(el);
      },
    };
  };
  const lines = pool<SVGPathElement>("path");
  const dots = pool<SVGCircleElement>("circle", (el) => {
    el.setAttribute("fill", color);
    el.setAttribute("stroke", "none");
  });
  const arcs = pool<SVGPathElement>("path");

  /** Where a drop lands right now: the surface at rest, moved by how far its body has turned and its carrier has leaned. */
  const landingY = (d: Drop) => {
    const h = d.hit!;
    const s = h.surface;
    if (!s.body && !s.carry) return h.y;
    // the surface point now under the drop's column (it has only moved a little: a few steps are plenty)
    let rx = d.x;
    for (let i = 0; i < 3; i++) {
      const t = topAt(s, rx);
      if (!t) return h.y;
      rx += d.x - placeOn(s, { x: rx, y: t.y }).x;
    }
    const t = topAt(s, rx);
    return t ? placeOn(s, { x: rx, y: t.y }).y : h.y;
  };

  /** What a landing does to the bodies under it. */
  const knock = (at: Point, hit: Hit, size: number, speed: number) => {
    const n = { x: hit.nx, y: hit.ny };
    hit.surface.body?.kick(at, n, speed, size * size);
    for (const sp of hit.surface.also ?? []) sp.kick(at, n, speed, size * size);
  };

  function splash(d: { x: number; size: number }, at: Hit, y: number) {
    const kind = at.surface.kind;
    const big = kind === "ground";
    const n = big ? 4 + Math.floor(rand() * 3) : 2 + Math.floor(rand() * 2);
    const base = Math.atan2(at.ny, at.nx); // straight out of the surface
    const spread = big ? 1.15 : 1.0; // radians either side of the normal
    for (let i = 0; i < n; i++) {
      const u = n === 1 ? 0 : (i / (n - 1)) * 2 - 1; // -1 .. 1 across the fan
      const ang = base + u * spread + (rand() - 0.5) * 0.35;
      const sp = (big ? 40 + rand() * 28 : 24 + rand() * 20) * (1 - 0.22 * Math.abs(u)) * Math.sqrt(d.size);
      const el = dots.take();
      const r = (big ? 0.5 : 0.38) * (0.7 + 0.6 * rand()) * d.size;
      el.setAttribute("r", r.toFixed(3));
      droplets.push({
        el,
        x: d.x,
        y,
        vx: Math.cos(ang) * sp,
        vy: Math.sin(ang) * sp,
        r,
        age: 0,
        life: big ? 0.55 : 0.4,
        ground: big,
      });
    }
    if (big && rand() < 0.5) {
      // a shallow crown along the surface; only half the hits get one, or the ground would be all arcs
      const el = arcs.take();
      el.setAttribute("stroke-width", String(lw(RIPPLE_WEIGHT)));
      ripples.push({
        el,
        x: d.x,
        y,
        tilt: (Math.atan2(at.nx, -at.ny) * 180) / Math.PI, // the arc bulges out along the surface normal
        age: 0,
        life: 0.3,
        rx: 0.7 + 0.4 * d.size,
      });
    }
  }

  /** Start a drop: at random under the cloud, or (`one`) a particular one that the caller follows. */
  function spawn(one?: { x: number; size: number; hit: Hit; onLand: () => void }) {
    const x = one ? one.x : o.from + rand() * (o.to - o.from);
    const size = one ? one.size : 0.75 + rand() * 0.55;
    const vTerm = one ? fall : fall * (0.92 + 0.16 * rand());
    const hit = one ? one.hit : surfaceAt(o.surfaces, x);
    if (!one && hit && dry !== null && hit.surface.id === dry) return; // this column is being kept dry
    const el = lines.take();
    const weight = 0.62 + 0.4 * (size - 0.75);
    el.setAttribute("stroke-width", String(lw(weight)));
    el.setAttribute("stroke-opacity", "0");
    drops.push({
      el, weight, x, head: o.y, v: vTerm * 0.25, vTerm, len: 0.042 * vTerm * (one ? 1 : 0.85 + 0.3 * rand()), size, hit, landed: false,
      onLand: one?.onLand,
    });
  }

  const z0 = o.zoom();
  let weighedAt = z0;
  function frame(dt: number, ramp: number, acc: { n: number }) {
    const z = o.zoom();
    if (Math.abs(z / weighedAt - 1) > CONFIG.zoomTolerance) {
      // keep streaks and ripples the same weight on screen
      weighedAt = z;
      for (const d of drops) d.el.setAttribute("stroke-width", String(lw(d.weight)));
      for (const r of ripples) r.el.setAttribute("stroke-width", String(lw(RIPPLE_WEIGHT)));
    }
    acc.n += perSecond * ramp * dt;
    while (acc.n >= 1) {
      acc.n -= 1;
      spawn();
    }

    for (let i = drops.length - 1; i >= 0; i--) {
      const d = drops[i];
      d.v += (d.vTerm - d.v) * (1 - Math.exp(-dt / 0.06));
      d.head += d.v * dt;
      let front = d.head;
      if (d.hit) {
        const yl = landingY(d);
        if (!d.landed && d.head >= yl) {
          d.landed = true;
          splash(d, d.hit, yl);
          knock({ x: d.x, y: yl }, d.hit, d.size, d.v);
          d.onLand?.();
        }
        if (d.landed) front = yl;
      }
      const tail = Math.max(o.y, d.head - d.len);
      if ((d.landed && tail >= front - 0.05) || (!d.hit && d.head - d.len > o.y + 400)) {
        lines.give(d.el);
        drops.splice(i, 1);
        continue;
      }
      d.el.setAttribute("d", `M${d.x.toFixed(2)} ${tail.toFixed(2)}V${front.toFixed(2)}`);
      // fades in out of the cloud as the streak grows to its length
      // (stroke-opacity, not opacity: no transparency group per streak)
      d.el.setAttribute("stroke-opacity", String(0.35 + 0.65 * clamp01((d.head - o.y) / 6)));
    }

    for (let i = droplets.length - 1; i >= 0; i--) {
      const p = droplets[i];
      p.age += dt;
      p.vy += GRAVITY * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      let dead = p.age >= p.life;
      if (p.ground && p.vy > 0) {
        const h = surfaceAt(ground, p.x);
        if (h && p.y >= h.y) dead = true; // back on the ground
      }
      if (dead) {
        dots.give(p.el);
        droplets.splice(i, 1);
        continue;
      }
      const k = p.age / p.life;
      p.el.setAttribute("cx", p.x.toFixed(2));
      p.el.setAttribute("cy", p.y.toFixed(2));
      // splash droplets are marks like the lines: the same size on screen however far the camera is in
      p.el.setAttribute("r", (p.r * (z0 / z) * (1 - 0.35 * k)).toFixed(3));
      p.el.setAttribute("fill-opacity", String(k < 0.55 ? 1 : 1 - (k - 0.55) / 0.45));
    }

    for (let i = ripples.length - 1; i >= 0; i--) {
      const r = ripples[i];
      r.age += dt;
      if (r.age >= r.life) {
        arcs.give(r.el);
        ripples.splice(i, 1);
        continue;
      }
      const k = r.age / r.life;
      const e = 1 - Math.pow(1 - k, 2); // fast out, then slows
      const rx = r.rx + 2.3 * e;
      const ry = 0.35 + 0.75 * Math.sin(Math.PI * Math.min(1, k * 1.15)) * (1 - 0.35 * k);
      // the dome from 15 to 165 degrees of an ellipse: its ends float just above the surface
      const ex = rx * Math.cos(Math.PI / 12);
      const ey = -ry * Math.sin(Math.PI / 12);
      r.el.setAttribute("d", `M${(-ex).toFixed(2)} ${ey.toFixed(2)} A${rx.toFixed(2)} ${ry.toFixed(2)} 0 0 1 ${ex.toFixed(2)} ${ey.toFixed(2)}`);
      r.el.setAttribute("transform", `translate(${r.x.toFixed(2)} ${r.y.toFixed(2)}) rotate(${r.tilt.toFixed(1)})`);
      r.el.setAttribute("stroke-opacity", String(0.9 * (1 - k * k)));
    }

    for (const s of springs) s.step(dt);
    o.onStep?.();
  }

  let cancelFrame = () => {};
  const acc = { n: 0 };
  const t0 = frameNow();
  let last = t0;
  const tick = (now: number) => {
    if (o.signal.aborted) return;
    const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
    last = now;
    frame(dt, smooth(clamp01((now - t0) / rampMs)), acc);
    cancelFrame = nextFrame(tick);
  };
  cancelFrame = nextFrame(tick);

  const stop = () => {
    cancelFrame();
    for (const s of springs) s.reset();
    g.remove();
  };
  o.signal.addEventListener("abort", stop, { once: true });
  return {
    stop,
    setRate(n) {
      perSecond = n;
    },
    avoid(id) {
      dry = id;
    },
    impact(x, hit, size, speed) {
      splash({ x, size }, hit, hit.y);
      knock({ x, y: hit.y }, hit, size, speed);
    },
    fall(x, size) {
      return new Promise<void>((resolve, reject) => {
        const hit = surfaceAt(o.surfaces, x);
        if (!hit) return reject(new Error("fab: the drop has nothing to land on"));
        o.signal.addEventListener("abort", () => reject(abortError()), { once: true });
        spawn({ x, size, hit, onLand: resolve });
      });
    },
  };
}
