import { easeInOutCubic } from "../timing";
import { boundsOf, matchShapes, parsePath, reversed, type Cubic } from "../morph";
import type { FabStroke, Scene } from "../types";

/**
 * THE FLOWER: finished and self-contained (see "The flower" in FABRICATOR_SVG_INSTRUCTIONS.md).
 *
 *   flowerStrokes     the strokes, in STACKING order, ids all start with "flower-"
 *   flowerDrawOrder   the order the laser draws them in (Piece.drawOrder)
 *   unfurlFlower(s)   bud -> open flower (~3.4 s), from any act
 *   flowerBounds      bounding box of bud + open flower
 * Coordinates are art/scene.svg's (no transform). Draw with Piece.headOnTop = true: the petals have
 * opaque fills that would hide the laser head.
 *
 * art/scene.svg holds two drawings of the same five petals: the hidden (display:none) paths are the
 * BUD, the visible ones the OPEN flower. morph.ts lines each pair up; the shapes are not changed.
 *
 *   petal   bud (hidden paths)                     open (visible path)
 *   1       path18        front, fully visible     path1   lower left
 *   2       path19 + path2   left, partly hidden   path4   left
 *   3       path20 + path7   right, partly hidden  path14  lower right
 *   4       path22        behind, never drawn      path15  upper left
 *   5       path23        behind, never drawn      path16  upper right
 *   center  path17        inside the bud           (the same)
 *
 * Stacking, back to front: 5, 4, center, 3, 2, 1, then a copy of the center. Petal bodies are filled
 * with the page background, so what is in front hides what is behind: the back petals and the center
 * sit unseen inside the bud and appear as the front petals open. The laser draws 1, 2, 3. Once the
 * petals are out, the copy of the center fades in on top (in the art it covers the petal bases) and
 * the one underneath is dropped.
 *
 * To change a shape: edit the path in art/scene.svg (keep its id) and run `pnpm fab:flower`, which
 * rewrites the block below (the generator should pass paths through `compactPath`, see compact-path.mjs).
 */
// <flower-src> — written by scripts/flower-from-scene.mjs, do not edit by hand
const SRC = {
  path18: "M163.24 -3.39C161.99 1.16 161.56 3.4 165.34 6.43C167.59 2.98 166.08 -0.84 163.24 -3.39Z",
  path19: "M163.22 -3.68C163.22 -3.68 161.1 -0.81 161.42 1.7C162.05 6.18 163.7 5.53 165.34 6.43",
  path20: "M163.22 -3.68C166.63 -2.67 167.69 1.52 167.04 4.03C166.9 4.74 166.74 5.48 165.34 6.43",
  path22: "M165.34 6.43C164.36 4.98 162.52 4.44 162.06 2.4C161.62 0.6 161.88 -1.71 163.22 -3.68C164.91 -1.38 164.12 -0.37 164.03 1.47C164.02 3.75 165.35 4.65 165.34 6.43",
  path23: "M165.32 6.43C166.29 4.98 166.94 4.35 167.16 1.85C167.15 -1.15 165.22 -2.76 163.22 -3.68C163.47 -0.94 164.86 -0.58 165.07 1.13C165.19 2.8 165.3 4.65 165.32 6.43",
  path2: "M163.22 -3.68C164.28 -2.37 164.39 -2.08 164.13 1.38C164.17 3.46 164.41 4.47 165.34 6.43",
  path7: "M163.22 -3.68C163.56 -1.7 164.17 -0.93 164.96 1.38C165.53 3.67 165.94 4.53 165.34 6.43",
  path1: "M159.8 9.9C160.13 7.84 161.57 3.18 165.34 6.21C167.59 2.76 162.63 12.46 159.8 9.9Z",
  path4: "M165.32 6.43C164.39 4.47 162.12 4.74 159.94 5.37C157.57 5.95 156.47 6.21 155.14 5.66C155.14 5.66 156.34 3.22 159.77 2.99C164.2 3.18 163.68 5.53 165.32 6.43",
  path14: "M169.5 5.25C168.77 4.96 165.81 4.53 165.32 6.43C166.63 5.86 166.21 6.43 168.28 7.56C169.88 8.32 171.34 8.7 173.25 8.75C172.57 6.69 171.47 5.85 169.5 5.25Z",
  path15: "M165.32 6.43C164.32 5.09 163.86 3.45 162.44 2.15C161.58 1.25 160.45 1.14 158.99 0.41C160.92 -0.02 163.95 0.11 164.96 1.88C165.96 3.22 165.33 4.65 165.32 6.43",
  path16: "M165.34 6.42C166.42 5.05 165.54 6.48 167.24 4.65C168.41 3.7 169.85 2.99 173.39 1.97C171.98 0.66 169.53 0.62 168.15 1.56C166.99 2.26 165.84 3.59 165.34 6.42",
  path17: "M166.56 5.44C166.53 5.82 166.13 6.14 165.34 6.1C164.55 6.06 164.1 5.69 164.12 5.31C164.15 4.93 164.64 4.67 165.43 4.71C166.22 4.76 166.58 5.05 166.56 5.44Z",
};
// </flower-src>
type Src = keyof typeof SRC;
const curve = (id: Src) => parsePath(SRC[id]);

/** Where the petals meet (the top of the stem). */
const BASE: [number, number] = [165.33, 6.43];
/** The same point, for the scene (in the flower's own coordinates): the hinge the petals turn about when rain knocks them. */
export const flowerBase = { x: BASE[0], y: BASE[1] };

/** The bud's two edges as one closed outline: down one edge, back up the other. */
const edges = (down: Src, up: Src): Cubic[] => [...curve(down), ...reversed(curve(up))];

const PAINT = "var(--background)"; // opaque body: hides what is behind it

function petal(
  name: string,
  bud: Cubic[],
  open: Src,
  extra: Partial<FabStroke> & { side?: "left" | "right" } = {},
): FabStroke {
  const { side, ...rest } = extra;
  const m = matchShapes(bud, curve(open), BASE);
  // The path starts at the base: the first `splitA` of it is the left edge (base
  // -> tip), the rest the right edge (tip -> base).
  const draw: [number, number] | undefined =
    side === "left" ? [0, m.splitA] : side === "right" ? [m.splitA, 1] : undefined;
  return {
    id: `flower-${name}`,
    d: m.from,
    poses: [{ at: 100, d: m.to }],
    fill: true,
    fillColor: PAINT,
    draw,
    ...rest,
  };
}

const center = (name: string): FabStroke => ({
  id: `flower-${name}`,
  d: SRC.path17,
  fill: true,
  fillColor: "currentColor",
  hidden: true,
});

/** Stacking order, back to front. */
export const flowerStrokes: FabStroke[] = [
  // behind everything, never drawn: they sit unseen inside the bud
  petal("petal-5", curve("path23"), "path16", { hidden: true }),
  petal("petal-4", curve("path22"), "path15", { hidden: true }),
  // inside the bud, under the front petals; never drawn
  center("center"),
  // partly hidden behind petal 1: the laser draws only the edge you can see
  petal("petal-3", edges("path20", "path7"), "path14", { side: "right" }),
  petal("petal-2", edges("path19", "path2"), "path4", { side: "left" }),
  petal("petal-1", curve("path18"), "path1"),
  // the center as the art has it: on top of the petal bases (fades in at the end)
  center("center-top"),
];

/** The order the laser draws in: the front petal first. */
export const flowerDrawOrder = ["flower-petal-1", "flower-petal-2", "flower-petal-3"];

/** Bounding box of bud + open flower, in scene.svg coordinates. */
export const flowerBounds = (() => {
  const b = boundsOf(Object.values(SRC).flatMap((d) => parsePath(d)));
  return { x: b.x0, y: b.y0, width: b.x1 - b.x0, height: b.y1 - b.y0 };
})();

/**
 * When each petal starts to open and how long it takes (ms). The front petals
 * go first; the ones behind follow as they are uncovered.
 */
const UNFURL = {
  "flower-petal-1": { at: 0, ms: 2100 },
  "flower-petal-2": { at: 250, ms: 2100 },
  "flower-petal-3": { at: 450, ms: 2100 },
  "flower-petal-4": { at: 900, ms: 2100 },
  "flower-petal-5": { at: 1100, ms: 2100 },
} as const;
const UNFURL_MS = 3200;
/** The center on top starts fading in as the petals come to rest. */
const TOP_AT = 2900;
const TOP_FADE_MS = 500;
const BACK = ["flower-petal-4", "flower-petal-5"];

/** The center grows from its tucked-in size to its real one between these times (ms). */
const CENTER_FROM = 900;
const CENTER_MS = 1700;

interface Tuck {
  /** Where the tucked-in center sits (its middle), and how big it is relative to the art. */
  x: number;
  y: number;
  k: number;
}
let tucked: Tuck | undefined;
let centerMiddle: [number, number] = [0, 0];

/**
 * In the art the center is wider than the bud is at its narrow base, so at full size
 * a bit of it would stick out below the petals. It therefore starts smaller and
 * higher up, inside the bud, and grows to its real size and place as the petals open.
 * Found from the real shapes (the biggest size that is entirely covered by the three
 * front petals, as near its real place as possible), once, while the bud is closed.
 */
function fitInsideBud(s: Scene): Tuck | undefined {
  const mid = s.stroke("flower-center");
  const cover = ["flower-petal-1", "flower-petal-2", "flower-petal-3"].map((id) => s.stroke(id));
  const svg = mid.ownerSVGElement!;
  const box = mid.getBBox();
  centerMiddle = [box.x + box.width / 2, box.y + box.height / 2];
  const len = mid.getTotalLength();
  const ring = Array.from({ length: 24 }, (_, i) => {
    const q = mid.getPointAtLength((len * i) / 24);
    return [q.x - centerMiddle[0], q.y - centerMiddle[1]] as const;
  });
  const covered = (x: number, y: number) => {
    const q = svg.createSVGPoint();
    q.x = x;
    q.y = y;
    return cover.some((c) => c.isPointInFill(q));
  };
  const margin = 0.15; // the line, its glow
  const fits = (cx: number, cy: number, k: number) =>
    ring.every(([dx, dy]) => {
      const r = Math.hypot(dx, dy) || 1;
      return covered(cx + k * dx + (dx / r) * margin, cy + k * dy + (dy / r) * margin);
    });
  // search positions in the middle of the front petals' extent
  const front = cover.map((c) => c.getBBox());
  const x0 = Math.min(...front.map((b) => b.x));
  const x1 = Math.max(...front.map((b) => b.x + b.width));
  const y0 = Math.min(...front.map((b) => b.y));
  const y1 = Math.max(...front.map((b) => b.y + b.height));
  for (let k = 1; k >= 0.15; k -= 0.05) {
    let best: Tuck | undefined;
    let bestDist = Infinity;
    for (let y = y0; y <= y1; y += 0.2) {
      for (let x = x0; x <= x1; x += 0.2) {
        const dist = Math.hypot(x - centerMiddle[0], y - centerMiddle[1]);
        if (dist < bestDist && fits(x, y, k)) {
          best = { x, y, k };
          bestDist = dist;
        }
      }
    }
    if (best) return best;
  }
  return undefined;
}

/** Put the center at `t` = 0 (tucked in) .. 1 (its real size and place). */
function growCenter(s: Scene, t: number) {
  const wrapper = s.stroke("flower-center").parentElement as SVGGElement | null;
  if (!wrapper || !tucked) return;
  const e = easeInOutCubic(t);
  const x = tucked.x + (centerMiddle[0] - tucked.x) * e;
  const y = tucked.y + (centerMiddle[1] - tucked.y) * e;
  const k = tucked.k + (1 - tucked.k) * e;
  // scale about the art's own middle, then put that middle at (x, y)
  wrapper.style.transformOrigin = "0 0";
  wrapper.style.transform = `translate(${x}px, ${y}px) scale(${k}) translate(${-centerMiddle[0]}px, ${-centerMiddle[1]}px)`;
}

/** Plays the petals open; `now` runs 0..UNFURL_MS. */
function move(s: Scene, onTime: (now: number) => void) {
  return s.tween(
    UNFURL_MS,
    (u) => {
      const now = u * UNFURL_MS;
      for (const [id, { at, ms }] of Object.entries(UNFURL)) {
        const k = Math.min(1, Math.max(0, (now - at) / ms));
        s.pose(id, 100 * easeInOutCubic(k));
      }
      growCenter(s, Math.min(1, Math.max(0, (now - CENTER_FROM) / CENTER_MS)));
      onTime(now);
    },
    (x) => x,
  );
}

/**
 * Bud -> open flower. The center is already inside the bud (tucked in, under the
 * front petals) and shows as they move away, growing to its real size; the back
 * petals appear the moment they start to open.
 */
export async function unfurlFlower(s: Scene) {
  tucked ??= fitInsideBud(s);
  growCenter(s, 0);
  s.show("flower-center"); // completely covered by the front petals
  const waiting = new Set(BACK);
  let top = false;
  await move(s, (now) => {
    for (const id of [...waiting]) {
      if (now >= UNFURL[id as keyof typeof UNFURL].at) {
        waiting.delete(id);
        s.show(id, 200);
      }
    }
    if (!top && now >= TOP_AT) {
      top = true;
      s.show("flower-center-top", TOP_FADE_MS);
    }
  });
  await s.wait(TOP_FADE_MS - (UNFURL_MS - TOP_AT));
  await s.hide("flower-center"); // the copy on top is all that is needed now
}
