import { flapAmount } from "./pose";
import type { Scene } from "./types";
import { clamp01, smooth } from "./util";

/** Reusable behaviours for the chapter's scenes: wing beats, glances, folding legs. */

/** Flap a stroke between pose 0 and its last pose, `flaps` times (`Infinity`: until teardown, via `scene.spawn`). */
export async function flapPoses(
  scene: Scene,
  ids: string | string[],
  { flaps = 4, periodMs = 700, upFraction = 0.4 } = {},
) {
  const list = Array.isArray(ids) ? ids : [ids];
  for (let i = 0; i < flaps; i++) {
    await scene.tween(periodMs, (u) => {
      for (const id of list) scene.pose(id, flapAmount(u, upFraction));
    });
  }
  for (const id of list) scene.pose(id, 0);
}

/** Where the pupil looks: x/y in -1..1 as a fraction of the room it has in the eye. */
export interface Gaze {
  x: number;
  y: number;
  /** How long it stays there after darting over. */
  holdMs: number;
}

/** The pupil darts between gazes and rests on each; the last gaze is where it stays. Travel is limited to the eye's inner room. */
export async function lookAround(
  scene: Scene,
  pupilId: string,
  eyeId: string,
  gazes: Gaze[],
  { dartMs = 150, startHoldMs = 250, margin = 0.08 } = {},
) {
  const pupil = scene.stroke(pupilId);
  const eye = scene.stroke(eyeId).getBBox();
  const p = pupil.getBBox();
  const line = parseFloat(pupil.getAttribute("stroke-width") ?? "0");
  const room = Math.max(
    0,
    Math.min(eye.width - p.width, eye.height - p.height) / 2 - line - margin,
  );
  const at = (g: { x: number; y: number }) => {
    const len = Math.hypot(g.x, g.y);
    const k = len > 1 ? 1 / len : 1;
    return `translate(${g.x * k * room}px, ${g.y * k * room}px)`;
  };

  const dart = "cubic-bezier(0.2, 0.8, 0.2, 1)";
  const total = startHoldMs + gazes.reduce((t, g) => t + dartMs + g.holdMs, 0);
  const rest = at({ x: 0, y: 0 });
  const frames: Keyframe[] = [
    { transform: rest, offset: 0, easing: "linear" },
    { transform: rest, offset: startHoldMs / total, easing: dart },
  ];
  let t = startHoldMs;
  for (const g of gazes) {
    t += dartMs;
    frames.push({ transform: at(g), offset: t / total, easing: "linear" });
    if (g.holdMs > 0) {
      t += g.holdMs;
      frames.push({ transform: at(g), offset: t / total, easing: dart });
    }
  }
  await scene.animate(pupil, frames, { duration: total });
}

export interface Leg {
  /** Straight stroke from hip (path start) to ankle (path end). */
  leg: string;
  /** Straight strokes starting at the ankle (the toes). */
  feet: string[];
}

export interface TuckOptions {
  /** Stroke the legs end up inside; whatever lies within it is masked away. */
  behind?: string;
  /** Duration; the swing leads, the rise follows a moment later. */
  ms?: number;
  /** How far down the leg the knee is (0 = hip, 1 = ankle). */
  knee?: number;
  /** How far the lower leg swings back, degrees from hanging down (~105 leaves the toes just below the knee). */
  fold?: number;
  /** Extra toe curl on top of the fold, degrees. */
  curl?: number;
}

type P = [number, number];
const sub = (a: P, b: P): P => [a[0] - b[0], a[1] - b[1]];
const turn = (v: P, deg: number): P => {
  const r = (deg * Math.PI) / 180;
  const c = Math.cos(r);
  const s = Math.sin(r);
  return [v[0] * c - v[1] * s, v[0] * s + v[1] * c];
};
const pt = (p: P) => `${p[0].toFixed(3)} ${p[1].toFixed(3)}`;
const lerpN = (a: P, b: P, n: number): P[] =>
  Array.from({ length: n + 1 }, (_, i): P => [a[0] + ((b[0] - a[0]) * i) / n, a[1] + ((b[1] - a[1]) * i) / n]);

/**
 * Retract legs for flight. Each leg is a straight stroke, re-shaped every frame into hip -> knee -> ankle:
 * the part above the knee rises straight up into the body, the part below swings back (toward the
 * tail) about the knee, the toes riding along. `behind` masks whatever is inside the body, and the
 * rise is the smallest one that leaves the folded leg completely inside.
 *
 * The measuring is the costly part, so this does it up front and returns the animation to start
 * later: call it while nothing moves, run the result when the bird takes off.
 */
export function prepareTuck(
  scene: Scene,
  legs: Leg[],
  { behind, ms = 1300, knee = 0.4, fold = 105, curl = 0 }: TuckOptions = {},
): () => Promise<void> {
  const ends = (el: SVGPathElement): [P, P] => {
    const a = el.getPointAtLength(0);
    const b = el.getPointAtLength(el.getTotalLength());
    return [[a.x, a.y], [b.x, b.y]];
  };

  const rig = legs.map(({ leg, feet }) => {
    const [hip, ankle] = ends(scene.stroke(leg));
    const knee0: P = [hip[0] + (ankle[0] - hip[0]) * knee, hip[1] + (ankle[1] - hip[1]) * knee];
    return {
      leg,
      hip,
      knee0,
      ankle,
      len: Math.hypot(hip[0] - ankle[0], hip[1] - ankle[1]),
      feet: feet.map((id) => ({ id, ends: ends(scene.stroke(id)) })),
    };
  });
  type Rig = (typeof rig)[number];
  const ids = legs.flatMap((l) => [l.leg, ...l.feet]);
  const longest = Math.max(...rig.map((r) => r.len));

  /** Every point of one leg and its toes for a given swing angle and rise. */
  const shape = (r: Rig, angle: number, rise: number) => {
    const hip: P = [r.hip[0], r.hip[1] - rise];
    const k: P = [r.knee0[0], r.knee0[1] - rise];
    const av = turn(sub(r.ankle, r.knee0), angle);
    const a: P = [k[0] + av[0], k[1] + av[1]];
    const toeAt = (e: P): P => {
      const v = turn(sub(e, r.ankle), angle + curl * (angle / fold));
      return [a[0] + v[0], a[1] + v[1]];
    };
    return { hip, k, a, toes: r.feet.map((f) => ({ id: f.id, p0: toeAt(f.ends[0]), p1: toeAt(f.ends[1]) })) };
  };

  // The smallest rise whose folded shape lies fully inside the body, plus a margin. Rising only
  // shifts the folded shape up, so it is sampled once and each candidate just moves the test points.
  let rise = longest;
  if (behind) {
    const body = scene.stroke(behind);
    const q = body.ownerSVGElement!.createSVGPoint();
    const samples = rig.flatMap((r) => {
      const f = shape(r, fold, 0);
      return [...lerpN(f.hip, f.k, 8), ...lerpN(f.k, f.a, 8), ...f.toes.flatMap((t) => lerpN(t.p0, t.p1, 8))];
    });
    const allInside = (rs: number) =>
      samples.every(([x, y]) => {
        q.x = x;
        q.y = y - rs;
        return body.isPointInFill(q);
      });
    const step = longest / 40;
    let rs = 0;
    while (rs < step * 160 && !allInside(rs)) rs += step;
    rise = rs + step * 3; // margin so the glow and the line width are hidden too
  }

  return async () => {
    if (behind) {
      // The legs are only ever seen inside the masked body or while moving: a glow on eight strokes
      // that are redrawn every frame is the costliest thing on screen, and at this size it is
      // sub-pixel. (They go away with the bird.)
      for (const id of ids) scene.stroke(id).removeAttribute("filter");
      scene.hideBehind(ids, behind, ms * 0.3);
    }
    const frame = (u: number) => {
      const angle = fold * smooth(clamp01(u / 0.75));
      const lift = rise * smooth(clamp01((u - 0.25) / 0.75));
      for (const r of rig) {
        const f = shape(r, angle, lift);
        scene.setPath(r.leg, `M${pt(f.hip)} L${pt(f.k)} L${pt(f.a)}`);
        for (const t of f.toes) scene.setPath(t.id, `M${pt(t.p0)} L${pt(t.p1)}`);
      }
    };
    await scene.tween(ms, frame);
    frame(1);
    // Now fully inside the body: hide them for real, since a mask costs on every frame of the flight.
    if (behind) await scene.hide(ids);
  };
}

/** `prepareTuck` and play it at once (for callers that have nothing to prepare ahead of time). */
export const tuckLegs = (scene: Scene, legs: Leg[], options?: TuckOptions) => prepareTuck(scene, legs, options)();
