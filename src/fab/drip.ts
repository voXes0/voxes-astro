import { type Rain, type Surface, extentOf, placeOn, surfaceAt, turnOf } from "./rain";
import { abortError } from "./timing";
import type { Point } from "./types";

/**
 * One raindrop, followed from the cloud to the water.
 *
 *   fall     a raindrop falls onto a petal: one of the rain's own streaks, a little heavier
 *            (`rain.fall`), so it looks like the rest and lands like them: it knocks the petal
 *            (and the stem under it) and throws a few droplets;
 *   bead     what is left spreads into a small bead of water that swells where it landed;
 *   slide    it creeps down the petal's upper edge: gravity along the surface against the
 *            water's grip on the petal (viscous drag, and it will not move at all on a
 *            surface that is too flat), so it starts slowly and gathers pace toward the tip;
 *   hang     at the tip it rolls round the point to hang beneath it, swelling and sagging into a
 *            pendant drop; its weight holds the petal a little down (the petal is a spring:
 *            rain.ts `Spring.setRest`);
 *   drop     it lets go. The petal, unloaded, rings back up and gives the drop a little push
 *            sideways; from there it is a free body under gravity (an exact parabola) that
 *            lands in the water at the chosen place.
 *
 * Everything the bead does sits ON the petal, so it is carried with it (turned by the petal's
 * spring about its hinge, then moved with the leaning stem) while the rain rocks the plant.
 * `onFrame` reports where the drop is so the camera can follow it.
 */

export type DripPhase = "bead" | "slide" | "hang" | "drop";

export interface DripFrame {
  phase: DripPhase;
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** 0..1 progress through the current phase (for `drop`: from letting go to the water). */
  u: number;
  /** Seconds since the last frame. */
  dt: number;
}

export interface DripOptions {
  host: SVGGElement;
  signal: AbortSignal;
  /** Stage units per world unit now (the camera zooms). */
  zoom: () => number;
  rain: Rain;
  /** The petal it lands on, and slides down: a petal surface with a body. */
  petal: Surface;
  /** Where the raindrop lands on the petal (its column). */
  x: number;
  /** Radius of the bead of water on the petal (world units); it swells to about 1.2 times this at the tip. */
  radius: number;
  /** The water: where the drop lands, at what height, and where the wall of the hill is at a given height (to stay clear of it). */
  water: { x: number; level: number; wallAt(y: number): number };
  /** World gravity, units per second squared (the splashes' scale: see rain.ts). */
  gravity?: number;
  onFrame?(f: DripFrame): void;
}

const NS = "http://www.w3.org/2000/svg";
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const easeOut = (x: number) => 1 - Math.pow(1 - x, 3);
const easeInOut = (x: number) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);

/** A drop's outline at its own origin: a circle of radius `r`, with a tail of `tail`*r above it (0 = a plain circle). */
function dropPath(r: number, tail: number): string {
  const f = (v: number) => (Math.round(v * 1000) / 1000).toString();
  if (tail < 0.03) return `M${f(-r)} 0 A${f(r)} ${f(r)} 0 1 1 ${f(r)} 0 A${f(r)} ${f(r)} 0 1 1 ${f(-r)} 0 Z`;
  const T = r * (1 + tail);
  const phi = Math.acos(r / T);
  const px = r * Math.sin(phi);
  const py = -r * Math.cos(phi);
  const cx = px * 0.3; // the sides curve in a little toward the tip
  const cy = (-T + py) / 2;
  return `M0 ${f(-T)} Q${f(cx)} ${f(cy)} ${f(px)} ${f(py)} A${f(r)} ${f(r)} 0 1 1 ${f(-px)} ${f(py)} Q${f(-cx)} ${f(cy)} 0 ${f(-T)} Z`;
}

/** A short reflection along the upper-left inside of the drop. */
function glint(r: number): string {
  const f = (v: number) => (Math.round(v * 1000) / 1000).toString();
  const k = 0.58 * r;
  const a1 = (-150 * Math.PI) / 180;
  const a2 = (-102 * Math.PI) / 180;
  return `M${f(k * Math.cos(a1))} ${f(k * Math.sin(a1))} A${f(k)} ${f(k)} 0 0 1 ${f(k * Math.cos(a2))} ${f(k * Math.sin(a2))}`;
}

/** Run `step` every frame until it returns true. */
function frames(signal: AbortSignal, step: (dt: number, t: number) => boolean | void): Promise<void> {
  return new Promise((resolve, reject) => {
    const t0 = performance.now();
    let last = t0;
    const tick = (now: number) => {
      if (signal.aborted) return reject(abortError());
      const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
      last = now;
      if (step(dt, (now - t0) / 1000) === true) return resolve();
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}

export async function dripOnPetal(o: DripOptions): Promise<{ x: number; y: number; speed: number; radius: number }> {
  const g = o.gravity ?? 320;
  const a = o.radius;
  const body = o.petal.body!;
  const hinge = body.pivot;
  const report = (f: DripFrame) => o.onFrame?.(f);

  const root = document.createElementNS(NS, "g");
  root.setAttribute("data-fab-drip", "");
  root.setAttribute("stroke-linejoin", "round");
  root.setAttribute("stroke-linecap", "round");
  const shape = document.createElementNS(NS, "g"); // moved and turned each frame
  const outline = document.createElementNS(NS, "path");
  const shine = document.createElementNS(NS, "path");
  outline.setAttribute("fill", "var(--low-opacity-secondary)");
  outline.setAttribute("stroke", "var(--secondary)");
  shine.setAttribute("fill", "none");
  shine.setAttribute("stroke", "var(--secondary)");
  shine.setAttribute("stroke-opacity", "0.7");
  shape.append(outline, shine);
  root.appendChild(shape);
  o.host.appendChild(root);

  let weighedAt = 0;
  const reweigh = () => {
    const z = o.zoom();
    if (Math.abs(z / (weighedAt || z) - 1) < 0.002 && weighedAt) return;
    weighedAt = z;
    outline.setAttribute("stroke-width", String(1 / z));
    shine.setAttribute("stroke-width", String(0.7 / z));
  };

  /** Draw the drop: centre, turn (degrees), a circle of radius r with `tail`, squashed along its own axes. */
  let shownRadius = -1;
  let shownTail = -1;
  const draw = (x: number, y: number, deg: number, r: number, tail: number, sx = 1, sy = 1, showShine = true) => {
    reweigh();
    if (Math.abs(r - shownRadius) > 1e-4 || Math.abs(tail - shownTail) > 1e-3) {
      outline.setAttribute("d", dropPath(r, tail));
      shine.setAttribute("d", glint(r));
      shownRadius = r;
      shownTail = tail;
    }
    shine.style.display = showShine ? "" : "none";
    shape.setAttribute("transform", `translate(${x.toFixed(3)} ${y.toFixed(3)}) rotate(${deg.toFixed(2)}) scale(${sx.toFixed(3)} ${sy.toFixed(3)})`);
  };

  /** A point that is fixed to the petal, where it is now (the petal's turn, then the stem's lean). */
  const carried = (p: Point): Point => placeOn(o.petal, p);
  const restAt = (x: number) => surfaceAt([o.petal], x);
  const turnDeg = (nx: number, ny: number) => (Math.atan2(nx, -ny) * 180) / Math.PI + (turnOf(o.petal) * 180) / Math.PI;

  try {
    // ---- the raindrop falls onto the petal (and knocks it, like any drop) -------------------------
    const hx = o.x;
    if (!restAt(hx)) throw new Error("fab: the drop does not land on the petal");
    await o.rain.fall(hx, 1.2);

    // ---- a bead forms where it landed --------------------------------------------------------
    const profile = (() => {
      // the petal's upper edge from the landing point to its tip, at rest
      const tipX = extentOf(o.petal.pts).x0;
      const pts: { x: number; y: number; nx: number; ny: number; s: number }[] = [];
      let s = 0;
      for (let x = hx; x >= tipX + 0.02; x -= 0.04) {
        const h = restAt(x);
        if (!h) continue;
        const prev = pts[pts.length - 1];
        if (prev) s += Math.hypot(x - prev.x, h.y - prev.y);
        pts.push({ x, y: h.y, nx: h.nx, ny: h.ny, s });
      }
      return pts;
    })();
    const at = (s: number) => {
      // position on the profile at arclength s (binary search + lerp)
      let lo = 0;
      let hi = profile.length - 1;
      while (hi - lo > 1) {
        const mid = (lo + hi) >> 1;
        if (profile[mid].s <= s) lo = mid;
        else hi = mid;
      }
      const p = profile[lo];
      const q = profile[hi];
      const k = q.s > p.s ? clamp01((s - p.s) / (q.s - p.s)) : 0;
      const down = q.s > p.s ? (q.y - p.y) / (q.s - p.s) : 0; // sin of the slope: > 0 going downhill
      return { x: p.x + (q.x - p.x) * k, y: p.y + (q.y - p.y) * k, nx: p.nx + (q.nx - p.nx) * k, ny: p.ny + (q.ny - p.ny) * k, down };
    };
    const total = profile[profile.length - 1].s;
    const tip = profile[profile.length - 1];

    /** Where the bead's centre is when it sits on the surface at s with radius r (squashed a bit: it sits low). */
    const sitting = (s: number, r: number, squashY: number) => {
      const p = at(s);
      const len = Math.hypot(p.nx, p.ny) || 1;
      const lift = r * squashY * 0.82;
      return carried({ x: p.x + (p.nx / len) * lift, y: p.y + (p.ny / len) * lift });
    };
    const KAPPA = 0.4; // degrees of turn per world unit of lever arm, for a bead of radius `a`
    const loadFor = (x: number, r: number) => ((KAPPA * Math.PI) / 180) * (x - hinge.x) * Math.pow(r / a, 3);

    {
      const T = 0.5;
      await frames(o.signal, (dt, t) => {
        const k = easeOut(clamp01(t / T));
        const r = a * (0.3 + 0.7 * k);
        const sx = 1 + 0.55 * (1 - k);
        const sy = 1 - 0.4 * (1 - k);
        const c = sitting(0, r, sy);
        const n = at(0);
        draw(c.x, c.y, turnDeg(n.nx, n.ny), r, 0, sx, sy);
        body.setRest(loadFor(c.x, r) * k);
        report({ phase: "bead", x: c.x, y: c.y, vx: 0, vy: 0, u: clamp01(t / T), dt });
        return t >= T + 0.3; // and it settles for a moment
      });
    }

    // ---- it slides down the petal ------------------------------------------------------------
    let s = 0;
    {
      let v = 0;
      const GRIP = 46; // viscous drag per second: the water holds on to the petal
      const STICK = 0.1; // slopes flatter than this (sin) hold it still
      let lastX = hx;
      await frames(o.signal, (dt) => {
        const p = at(s);
        if (p.down > STICK || v > 0.05) v += (g * p.down - GRIP * v) * dt;
        v = Math.max(0, v);
        s = Math.min(total, s + v * dt);
        const n = at(s);
        const c = sitting(s, a, 1);
        // it stretches a little along the way it is going
        const sx = 1 + Math.min(0.25, v * 0.05);
        draw(c.x, c.y, turnDeg(n.nx, n.ny), a, 0, sx, 1 / Math.sqrt(sx));
        body.setRest(loadFor(c.x, a));
        const vx = (c.x - lastX) / Math.max(dt, 1e-3);
        lastX = c.x;
        report({ phase: "slide", x: c.x, y: c.y, vx, vy: 0, u: total > 0 ? s / total : 1, dt });
        return s >= total - 1e-3;
      });
    }

    // ---- it rolls round the tip to hang beneath it, swelling -------------------------------------
    // The bead goes round the point of the tip, on the outside (from the upper left, through the left,
    // to straight below), so it never crosses the petal; and it sags into a pendant drop on the way.
    let release: { x: number; y: number; r: number; tail: number };
    {
      const T = 0.9;
      const nTip = at(total);
      const a0 = Math.atan2(nTip.ny, nTip.nx); // pointing up and out of the tip
      const a1 = Math.PI / 2 - 2 * Math.PI; // straight down, reached by turning through the left
      const lift0 = a * 0.82;
      const turn0 = (Math.atan2(nTip.nx, -nTip.ny) * 180) / Math.PI; // how it lay on the edge, before the petal's own turn
      await frames(o.signal, (dt, t) => {
        const k = clamp01(t / T);
        const e = easeInOut(k);
        const r = a * (1 + 0.2 * e); // water keeps arriving: it grows
        const tail = 0.55 * e * e; // and sags: a pendant drop, narrow where it hangs from the petal
        const ang = a0 + (a1 - a0) * e;
        const dist = lift0 + (r * (1 + 0.8 * tail) - lift0) * e;
        const c = carried({ x: tip.x + Math.cos(ang) * dist, y: tip.y + Math.sin(ang) * dist });
        // it turns from lying on the edge (as it slid) to hanging with its tail up at the tip: one
        // continuous turn, so its glint does not jump from one side to the other
        const deg = turn0 * (1 - e) + (turnOf(o.petal) * 180) / Math.PI;
        draw(c.x, c.y, deg, r, tail, 1 - 0.06 * e, 1 + 0.08 * e);
        body.setRest(loadFor(c.x, r));
        report({ phase: "hang", x: c.x, y: c.y, vx: 0, vy: 0, u: k, dt });
        release = { x: c.x, y: c.y, r, tail };
        return k >= 1;
      });
    }

    // ---- it lets go and falls to the water --------------------------------------------------
    body.setRest(0); // the weight is gone: the petal rings back up
    const { x: x0, y: y0, r: r0, tail: tail0 } = release!;
    const level = o.water.level - r0; // centre height when its underside touches the water
    const flight = Math.sqrt((2 * (level - y0)) / g); // let go from rest, straight down...
    const vx0 = (o.water.x - x0) / flight; // ...but the petal's recoil gives it a push toward the water it will land in
    // stay clear of the hill: the wall leans out under the petal
    for (let i = 1; i < 40; i++) {
      const t = (flight * i) / 40;
      const px = x0 + vx0 * t;
      const py = y0 + 0.5 * g * t * t;
      if (px + r0 > o.water.wallAt(py) - 0.5) console.warn(`fab: the falling drop is close to the hill at y=${py.toFixed(1)}`);
    }
    {
      let hx2 = x0;
      let hy = y0;
      let vy = 0;
      let deg = (turnOf(o.petal) * 180) / Math.PI; // it starts as it hung, and turns to trail behind it
      await frames(o.signal, (dt, t) => {
        vy += g * dt;
        hx2 += vx0 * dt;
        hy += vy * dt;
        const target = (Math.atan2(-vx0, Math.max(vy, 40)) * 180) / Math.PI;
        deg += (target - deg) * (1 - Math.exp(-dt / 0.08));
        const tail = 0.3 + (tail0 - 0.3) * Math.exp(-t / 0.14);
        draw(hx2, hy, deg, r0, tail, 1, 1);
        report({ phase: "drop", x: hx2, y: hy, vx: vx0, vy, u: clamp01(t / flight), dt });
        return hy >= level;
      });
      return { x: hx2, y: o.water.level, speed: Math.hypot(vx0, vy), radius: r0 };
    }
  } finally {
    body.setRest(0);
    root.remove();
  }
}
