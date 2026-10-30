import splash from "./pieces/splash.json";
import { abortError, frameNow, nextFrame } from "./timing";
import { SVG_NS as NS } from "./config";
import { clamp01, smooth } from "./util";

/**
 * Plays the baked drop-splash splash.json on the scene's water.
 * It is a SIDE view: the pond is a line and the ripples are that line moving.
 *
 *   - The surface profile h(|x|, t) reshapes the real water line (and the water body under it).
 *   - The crown, central jet and flying droplets are drawn on top as the preview does
 *     (art/splash-preview.html, `svgFor`), at the data's true scale: its lengths are in drop radii
 *     `a`, here `a` world units.
 *   - Near the wall the profile eases to zero, so the line stays joined to the hill (the waves are
 *     cut off there; the data's field is 40 a).
 *
 * Playback runs at the data's own frame rate and slow motion (`fps`), as the preview shows it.
 */

interface Frame {
  h: number[];
  crown: number[] | null;
  jet: number[] | null;
  drops: number[][];
}
const D = splash as unknown as {
  fps: number;
  duration: number;
  field: number;
  points: number;
  spikes: number[];
  frames: Frame[];
};

const dx = D.field / (D.points - 1);

/** Surface height (in drop radii) at distance `r` from the impact, from one frame's samples. */
function hAt(h: number[], r: number): number {
  const u = Math.min(D.points - 1.001, Math.abs(r) / dx);
  const i = Math.floor(u);
  const f = u - i;
  return (h[i] * (1 - f) + h[i + 1] * f) / 100;
}

/** The data at playback time `t` (seconds): the surface is blended between frames, the rest taken from the one before. */
function frameAt(t: number): Frame {
  const x = Math.min(D.frames.length - 1.001, Math.max(0, t * D.fps));
  const i = Math.floor(x);
  const f = x - i;
  const a = D.frames[i];
  const b = D.frames[i + 1];
  return { ...a, h: a.h.map((v, k) => v * (1 - f) + b.h[k] * f) };
}


export interface PondOptions {
  /** World group the crown, jet and droplets are drawn into. */
  host: SVGGElement;
  signal: AbortSignal;
  /** Stage units per world unit now (the camera zooms), to keep lines the same weight as the rest. */
  zoom: () => number;
  /** The water line runs from `x0` to `x1` (the wall) at height `level`. */
  x0: number;
  x1: number;
  level: number;
  /** Reshape the water line, and the body of water under it. */
  setLine(d: string): void;
  setFill(d: string): void;
  /** The water body's outline as drawn, without its closing top edge: the surface is added to it. */
  fillBase: string;
  /** Where the hill's wall is at a given height: droplets that would fly through it are not drawn. */
  wallAt?(y: number): number;
  /** Surface eases to nothing over this much of the wall's side. */
  wallEase?: number;
}

export function createPond(o: PondOptions) {
  const ease = o.wallEase ?? 4;
  const n = (v: number) => (Math.round(v * 100) / 100).toString();

  async function play(xi: number, a: number): Promise<void> {
    const g = document.createElementNS(NS, "g");
    g.setAttribute("data-fab-splash", "");
    g.setAttribute("transform", `translate(${xi} ${o.level})`);
    g.setAttribute("stroke-linejoin", "round");
    g.setAttribute("stroke-linecap", "round");
    const crownEl = document.createElementNS(NS, "path");
    const jetEl = document.createElementNS(NS, "path");
    for (const el of [crownEl, jetEl]) {
      el.setAttribute("fill", "none");
      el.setAttribute("stroke", "var(--soft-secondary)");
    }
    jetEl.setAttribute("fill", "var(--low-opacity-secondary)");
    g.append(crownEl, jetEl);
    const dots: SVGCircleElement[] = [];
    o.host.appendChild(g);

    // where along the line the surface is sampled: fine near the impact, coarse far away
    const xs: number[] = [];
    const reach = D.field * a + 2;
    for (let x = o.x0; x < o.x1; x += Math.abs(x - xi) < reach ? 0.35 : 3) xs.push(x);
    xs.push(o.x1);

    const surface = (h: number[], x: number) =>
      o.level - a * hAt(h, (x - xi) / a) * smooth(clamp01((o.x1 - x) / ease));

    const finish = () => {
      g.remove();
      const flat = `M${n(o.x0)} ${n(o.level)} L${n(o.x1)} ${n(o.level)}`;
      o.setLine(flat);
      o.setFill(`${o.fillBase} Z`); // the water as drawn: its closing edge is the flat top
    };

    try {
      await new Promise<void>((resolve, reject) => {
        const t0 = frameNow();
        let weighed = 0;
        const tick = (now: number) => {
          if (o.signal.aborted) return reject(abortError());
          const t = (now - t0) / 1000;
          if (t >= D.duration) return resolve();
          const f = frameAt(Math.max(0, t));

          // the water line and the water under it
          const pts = xs.map((x) => `${n(x)} ${n(surface(f.h, x))}`);
          o.setLine(`M${pts.join(" L")}`);
          o.setFill(`${o.fillBase} L${pts.join(" L")} Z`);

          // line weight on screen stays what it was whatever the zoom
          const z = o.zoom();
          if (Math.abs(z / (weighed || z) - 1) > 0.002 || !weighed) {
            weighed = z;
            const w = String(1.3 / z);
            crownEl.setAttribute("stroke-width", w);
            jetEl.setAttribute("stroke-width", w);
          }

          // crown (the rim of the splash), as the preview draws it
          if (f.crown) {
            const [r, zc, al] = f.crown;
            const P: [number, number][] = [];
            for (let i = 0; i < D.spikes.length; i++) {
              const th = (2 * Math.PI * (i + 0.5)) / D.spikes.length;
              const x = r * 1.04 * Math.cos(th); // one scallop per spike
              P.push([x * a, -(hAt(f.h, x) + zc * (0.7 + 0.3 * D.spikes[i])) * a]);
            }
            P.sort((p, q) => p[0] - q[0]);
            const lx = r * 1.12; // the walls lean out a little
            const ls = [-r * a, -hAt(f.h, r) * a];
            const rs = [r * a, -hAt(f.h, r) * a];
            const lt = [-lx * a, -(hAt(f.h, lx) + zc) * a];
            const rt = [lx * a, -(hAt(f.h, lx) + zc) * a];
            const pp = [lt, ...P, rt];
            const mid = (p: number[], q: number[]) => [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
            const f2 = (v: number[]) => `${n(v[0])} ${n(v[1])}`;
            let c = `M${f2(ls)} L${f2(lt)} L${f2(mid(pp[0], pp[1]))}`;
            for (let i = 1; i < pp.length - 1; i++) c += ` Q${f2(pp[i])} ${f2(mid(pp[i], pp[i + 1]))}`;
            c += ` L${f2(rt)} L${f2(rs)}`;
            crownEl.setAttribute("d", c);
            crownEl.setAttribute("stroke-opacity", String(al));
            crownEl.style.display = "";
          } else crownEl.style.display = "none";

          // the Worthington jet: a flared column with a rounded cap, closed along the water
          let showJet = false;
          if (f.jet) {
            const [zj, w] = f.jet;
            const Z = zj * a;
            const W = w * a;
            const Wt = W * 0.62;
            const Wb = W * 2.4;
            const b = -hAt(f.h, 0) * a;
            if (Z > 0.09 * a) {
              const top = Math.max(Wt, Z - Wt);
              const sy = (px: number) => -hAt(f.h, px / a) * a;
              let base = "";
              for (let i = 7; i >= 0; i--) {
                const px = -Wb + (2 * Wb * i) / 8;
                base += ` L${n(px)} ${n(sy(px))}`; // right to left, along the water
              }
              const lift = 0.22 * a;
              jetEl.setAttribute(
                "d",
                `M${n(-Wb)} ${n(sy(-Wb))} C${n(-W)} ${n(b - lift)} ${n(-Wt * 1.05)} ${n(b - 0.45 * top)} ${n(-Wt)} ${n(b - top)} ` +
                  `A${n(Wt)} ${n(Wt)} 0 0 1 ${n(Wt)} ${n(b - top)} C${n(Wt * 1.05)} ${n(b - 0.45 * top)} ${n(W)} ${n(b - lift)} ${n(Wb)} ${n(sy(Wb))}${base} Z`,
              );
              showJet = true;
            }
          }
          jetEl.style.display = showJet ? "" : "none";

          // droplets
          while (dots.length < f.drops.length) {
            const c = document.createElementNS(NS, "circle");
            c.setAttribute("fill", "var(--secondary)");
            g.appendChild(c);
            dots.push(c);
          }
          dots.forEach((c, i) => {
            const d = f.drops[i];
            if (!d || (o.wallAt && xi + d[0] * a > o.wallAt(o.level - d[1] * a) - 0.2)) return void (c.style.display = "none");
            c.style.display = "";
            c.setAttribute("cx", n(d[0] * a));
            c.setAttribute("cy", n(-d[1] * a));
            c.setAttribute("r", n(d[2] * a * 0.5));
            c.setAttribute("fill-opacity", String(d[3]));
          });

          nextFrame(tick);
        };
        nextFrame(tick);
      });
    } finally {
      finish();
    }
  }

  return {
    /** A drop of radius `a` (world units) falls into the water at `x`; resolves when the water is still. */
    splash: play,
  };
}
