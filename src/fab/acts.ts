import { flapAmount } from "./pose";
import type { Scene } from "./types";

/**
 * Reusable behaviours for a piece's `act`. A piece composes these (or writes
 * its own with scene.animate) — none of them touch the draw engine.
 */

/** A rotation about a point, written so it needs no transform-origin. */
export function rotateAbout(deg: number, [px, py]: [number, number]): string {
  return `translate(${px}px, ${py}px) rotate(${deg}deg) translate(${-px}px, ${-py}px)`;
}

export interface Wing {
  /** Stroke id of the wing. */
  id: string;
  /** Pivot name (the shoulder), declared in the piece's `pivots`. */
  pivot: string;
  /**
   * Beat direction. Normally inferred from which side of the pivot the wing
   * extends: +1 raises counter-clockwise (wing extends right), -1 clockwise
   * (extends left). Set it only for a wing extending mostly up or down.
   */
  dir?: 1 | -1;
}

/**
 * Flap wings about their shoulders: up, a softer down-beat, back to rest.
 * Ends exactly at the rest pose.
 */
export async function flap(
  scene: Scene,
  wings: Wing[],
  { flaps = 4, periodMs = 520, amplitude = 38 } = {},
) {
  await Promise.all(
    wings.map(({ id, pivot, dir: dirOverride }) => {
      const el = scene.stroke(id);
      const p = scene.pivot(pivot);
      const box = el.getBBox(); // same coordinate space as the pivot
      const dir = dirOverride ?? (box.x + box.width / 2 < p[0] ? -1 : 1);
      el.style.transformOrigin = "0 0";
      el.style.transformBox = "view-box";
      return scene.animate(
        el,
        [
          { transform: rotateAbout(0, p), offset: 0, easing: "ease-out" },
          { transform: rotateAbout(-dir * amplitude, p), offset: 0.38, easing: "ease-in-out" },
          { transform: rotateAbout(dir * amplitude * 0.35, p), offset: 0.75, easing: "ease-in-out" },
          { transform: rotateAbout(0, p), offset: 1 },
        ],
        { duration: periodMs, iterations: flaps },
      );
    }),
  );
}

/**
 * Flap a stroke between its pose 0 (as drawn) and its last pose.
 *
 * `flaps: Infinity` keeps flapping until the piece is torn down (start it with
 * `scene.spawn` so the wings beat for as long as the bird is on screen).
 *
 * See `flapAmount` for the beat curve. Starts and ends at pose 0.
 */
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

/**
 * A bird's quick glances: the pupil darts between gazes (fast ease-out) and
 * rests on each. The last gaze is where it stays. The pupil's travel is limited
 * to the room inside the eye, measured from the two shapes, so it never leaves
 * the eye whatever size they are drawn at.
 */
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
    const k = len > 1 ? 1 / len : 1; // stay inside the circle of travel
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

/**
 * Retract legs for flight.
 *
 *  - The part above the knee does not bend: it simply rises, straight up, into
 *    the body.
 *  - The part below the knee swings back (toward the tail) about the knee, the
 *    toes riding along, until the feet end up a little lower than the knee.
 *
 * The leg is a straight stroke; each frame it is re-shaped into
 * hip -> knee -> ankle. `behind` hides whatever is inside that shape, so the
 * legs disappear into the body as they rise; the rise is computed so the
 * folded leg ends up completely inside it.
 *
 * knee   how far down the leg the knee is (0 = hip, 1 = ankle)
 * fold   how far the lower leg swings back, degrees from hanging straight down
 *        (90 = horizontal, pointing back). ~105 leaves the toes a little below
 *        the knee for typical bird proportions.
 * curl   extra toe curl on top of the fold (degrees)
 * ms     duration; the swing leads and the rise follows a moment later
 */
export async function tuckLegs(
  scene: Scene,
  legs: Leg[],
  {
    behind,
    ms = 1300,
    knee = 0.4,
    fold = 105,
    curl = 0,
  }: { behind?: string; ms?: number; knee?: number; fold?: number; curl?: number } = {},
) {
  type P = [number, number];
  const ends = (el: SVGPathElement): [P, P] => {
    const len = el.getTotalLength();
    const a = el.getPointAtLength(0);
    const b = el.getPointAtLength(len);
    return [[a.x, a.y], [b.x, b.y]];
  };
  const sub = (a: P, b: P): P => [a[0] - b[0], a[1] - b[1]];
  const turn = (v: P, deg: number): P => {
    const r = (deg * Math.PI) / 180;
    const c = Math.cos(r);
    const s = Math.sin(r);
    return [v[0] * c - v[1] * s, v[0] * s + v[1] * c];
  };
  const pt = (p: P) => `${p[0].toFixed(3)} ${p[1].toFixed(3)}`;
  const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
  const smooth = (x: number) => x * x * (3 - 2 * x);

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

  /** Every point of every leg/toe stroke for a given swing angle and rise. */
  type Rig = (typeof rig)[number];
  const shape = (r: Rig, angle: number, rise: number) => {
    const up: P = [0, -rise]; // straight up in the piece's own space
    const hip: P = [r.hip[0] + up[0], r.hip[1] + up[1]];
    const k: P = [r.knee0[0] + up[0], r.knee0[1] + up[1]];
    const av = turn(sub(r.ankle, r.knee0), angle);
    const a: P = [k[0] + av[0], k[1] + av[1]];
    const toes = r.feet.map((f) => {
      const v0 = turn(sub(f.ends[0], r.ankle), angle + curl * (angle / fold));
      const v1 = turn(sub(f.ends[1], r.ankle), angle + curl * (angle / fold));
      return { id: f.id, p0: [a[0] + v0[0], a[1] + v0[1]] as P, p1: [a[0] + v1[0], a[1] + v1[1]] as P };
    });
    return { hip, k, a, toes };
  };

  // How far must the leg rise to be entirely inside the body? Search for the
  // smallest rise whose folded shape lies fully inside, then add a margin.
  let rise = Math.max(...rig.map((r) => r.len));
  if (behind) {
    const body = scene.stroke(behind);
    const svg = body.ownerSVGElement!;
    const inside = (p: P) => {
      const q = svg.createSVGPoint();
      q.x = p[0];
      q.y = p[1];
      return body.isPointInFill(q);
    };
    const along = (a: P, b: P) =>
      Array.from({ length: 9 }, (_, i): P => [a[0] + ((b[0] - a[0]) * i) / 8, a[1] + ((b[1] - a[1]) * i) / 8]);
    const allInside = (rs: number) =>
      rig.every((r) => {
        const f = shape(r, fold, rs);
        return [
          ...along(f.hip, f.k),
          ...along(f.k, f.a),
          ...f.toes.flatMap((t) => along(t.p0, t.p1)),
        ].every(inside);
      });
    const step = Math.max(...rig.map((r) => r.len)) / 40;
    let rs = 0;
    while (rs < step * 160 && !allInside(rs)) rs += step;
    rise = rs + step * 3; // margin so the glow and the line width are hidden too
    scene.hideBehind(legs.flatMap((l) => [l.leg, ...l.feet]), behind, ms * 0.3);
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
}
