import { createSpring, type Spring } from "./rain";
import type { Point } from "./types";

/**
 * A stem that gives when the rain hits what grows on it.
 *
 * The stem is a cantilever: fixed at its foot, free at the top. A drop that lands on a petal
 * pushes the whole plant (the same knock the petal gets, about the stem's foot), the stem bends
 * and rings (a slow, lightly damped spring: a flower on a thin stem sways, it does not snap back),
 * and the next drop adds to whatever it is already doing.
 *
 * How it bends: if the top has moved sideways by `tip`, a point a fraction `u` of the way up has
 * moved by  tip * (3u^2 - u^3) / 2  (the deflection of a beam loaded at its end), and the stem there
 * is turned by  tip * (6u - 3u^2) / (2 H)  where H is its height. So the foot stays put, the stem
 * stays smooth, and the top (with the flower on it) tilts by 1.5 tip / H.
 *
 * This module only does the mechanics; scene.ts moves the drawing (the stem's path, the flower,
 * the leaves) to follow.
 */

export interface StemOptions {
  /** World position of the stem's foot and of its top (where the flower sits). */
  foot: Point;
  top: Point;
  /** Swaying frequency (Hz) and damping ratio. */
  freqHz: number;
  zeta: number;
  /** How hard a drop pushes it (see Spring `gain`). */
  gain: number;
  /** The most the top may lean sideways, world units. */
  maxTip: number;
}

export interface Stem {
  /** The body to put in a surface's `also`: drops landing there bend the stem. */
  spring: Spring;
  readonly height: number;
  /** How far the top has moved sideways now (world units, + is right). */
  readonly tip: number;
  /** Sideways shift at world height `y` (0 at the foot, `tip` at the top). */
  shiftAt(y: number): number;
  /** How far the stem is turned at world height `y`, radians (+ is clockwise on screen). */
  turnAt(y: number): number;
}

export function createStem(o: StemOptions): Stem {
  const height = o.foot.y - o.top.y;
  const spring = createSpring({
    targets: [],
    pivot: o.foot,
    pivotLocal: o.foot,
    reach: height,
    freqHz: o.freqHz,
    zeta: o.zeta,
    gain: o.gain,
    maxDeg: ((o.maxTip / height) * 180) / Math.PI,
  });
  const u = (y: number) => Math.min(1, Math.max(0, (o.foot.y - y) / height));
  const tip = () => spring.theta * height;
  return {
    spring,
    height,
    get tip() {
      return tip();
    },
    shiftAt(y) {
      const k = u(y);
      return (tip() * (3 * k * k - k * k * k)) / 2;
    },
    turnAt(y) {
      const k = u(y);
      return (tip() * (6 * k - 3 * k * k)) / (2 * height);
    },
  };
}

/**
 * Move every point of a path sideways by `dx(y)`, where y is the point's own height (as the path
 * is written: absolute coordinates, commands M L C Z, pairs separated by spaces). Control points
 * move like the points they belong to, which is exact for a smooth, small bend.
 */
export function bendPath(d: string, dx: (y: number) => number): string {
  return d.replace(/(-?\d*\.?\d+)\s+(-?\d*\.?\d+)/g, (_m, x: string, y: string) => {
    const yy = parseFloat(y);
    return `${(parseFloat(x) + dx(yy)).toFixed(3)} ${y}`;
  });
}
