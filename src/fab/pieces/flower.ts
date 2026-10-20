import { easeInOutCubic } from "../timing";
import { boundsOf, matchShapes, parsePath, reversed, type Cubic } from "../morph";
import type { FabStroke, Piece, Scene } from "../types";

/**
 * THE FLOWER — finished and self-contained. Nothing else in the project needs to
 * read this file or src/fab/morph.ts; see "The flower" in FABRICATOR_SVG_INSTRUCTIONS.md.
 *
 * What a scene (or the test piece below) uses:
 *   flowerStrokes     the strokes, in STACKING order, ids all start with "flower-"
 *   flowerDrawOrder   the order the laser draws them in (Piece.drawOrder)
 *   unfurlFlower(s)   bud -> open flower (~3.4 s)        call from any act
 *   foldFlower(s)     open flower -> bud again (~3.4 s)  (the unfurl, reversed)
 *   flowerBounds      bounding box of bud + open flower, in the coordinates below
 *   flower            a ready-made Piece that draws the bud and unfurls it (test piece)
 * Coordinates are those of art/scene.svg (no transform). Draw the strokes with
 * Piece.headOnTop = true: the petals have opaque fills that would hide the laser head.
 *
 * art/scene.svg holds two drawings of the same five petals: the hidden
 * (display:none) paths are the BUD, the visible ones the OPEN flower. Each
 * petal's bud shape turns into its open shape (src/fab/morph.ts lines the two
 * outlines up; the shapes themselves are not changed).
 *
 *   petal   bud (hidden paths)                      open (visible path)
 *   1       path18        front, fully visible      path1   lower left
 *   2       path19 + path2   left, partly hidden    path4   left
 *   3       path20 + path7   right, partly hidden   path14  lower right
 *   4       path22        behind, never drawn       path15  upper left
 *   5       path23        behind, never drawn       path16  upper right
 *   center  path17        sits inside the bud       (the same)
 *
 * Stacking, back to front: 5, 4, center, 3, 2, 1, then a copy of the center. Every
 * petal body is filled with the page background, so what is in front hides what is
 * behind: the back petals and the center sit unseen inside the bud and only appear as
 * the front petals open, and nothing shows through. The laser draws 1, then 2, then 3.
 * Once the petals are out, the copy of the center fades in on top of them (in the art
 * the center covers the petal bases) and the one underneath is dropped.
 *
 * To change a shape: edit the path in art/scene.svg (keep its id) and run
 * `pnpm fab:flower`, which rewrites the block below.
 */
// <flower-src> — written by scripts/flower-from-scene.mjs, do not edit by hand
const SRC = {
  path18: "m 163.24378,-3.3902542 c -1.2506,4.549017 -1.67892,6.786655 2.09413,9.821884 2.24825,-3.449005 0.7433,-7.26884293 -2.09413,-9.821884 z",
  path19: "m 163.22326,-3.6774052 c 0,0 -2.11878,2.87072907 -1.80494,5.373806 0.63583,4.482721 2.28394,3.832501 3.91959,4.735225",
  path20: "m 163.22326,-3.6774072 c 3.40676,1.01115 4.46235,5.199794 3.81501,7.712035 -0.14157,0.710118 -0.29819,1.447585 -1.70036,2.396998",
  path22: "m 165.33789,6.4316138 c -0.97357,-1.45233 -2.81962,-1.994847 -3.28108,-4.029726 -0.43541,-1.80405493 -0.17461,-4.109444 1.16645,-6.079293 1.68914,2.295072 0.89712,3.30791807 0.8079,5.146465 -0.0113,2.280519 1.31803,3.177883 1.30673,4.962555",
  path23: "m 165.31599,6.4316138 c 0.97357,-1.45233 1.62003,-2.079365 1.84044,-4.581459 -0.009,-2.996982 -1.93485,-4.607809 -3.93317,-5.52756 0.24834,2.73406007 1.63477,3.09533407 1.85006,4.809295 0.11972,1.667483 0.23137,3.515053 0.24267,5.299725",
  path2: "m 163.22326,-3.6774052 c 1.06113,1.305461 1.16401,1.59944 0.90315,5.054515 0.0405,2.08677 0.28694,3.094041 1.2115,5.054515",
  path7: "m 163.22326,-3.6774072 c 0.33701,1.974781 0.94574,2.74343807 1.73942,5.054517 0.56976,2.290365 0.98034,3.152484 0.37523,5.054513",
  path1: "m 159.79565,9.9026028 c 0.33203,-2.065566 1.7704,-6.726574 5.54345,-3.691345 2.24825,-3.449005 -2.70602,6.2443862 -5.54345,3.691345 z",
  path4: "m 165.31599,6.4316138 c -0.92456,-1.960474 -3.19839,-1.689381 -5.37221,-1.063068 -2.37262,0.580289 -3.47083,0.838541 -4.80418,0.286946 0,0 1.2048,-2.430591 4.63201,-2.667846 4.42975,0.192879 3.90873,2.541245 5.54438,3.443969",
  path14: "m 169.50142,5.2537678 c -0.73593,-0.297243 -3.6951,-0.724185 -4.18543,1.177846 1.31609,-0.576382 0.89227,0 2.9617,1.133034 1.60603,0.75948 3.06018,1.133386 4.96996,1.181105 -0.67518,-2.055887 -1.77771,-2.894358 -3.74623,-3.491985 z",
  path15: "m 165.31599,6.4316138 c -0.99805,-1.343242 -1.45829,-2.981492 -2.87655,-4.285346 -0.85624,-0.897515 -1.98546,-1.00941 -3.44616,-1.73690893 1.9235,-0.43335 4.95241,-0.303816 5.96994,1.47127193 0.99601,1.342286 0.36407,2.766311 0.35277,4.550983",
  path16: "m 165.33795,6.4220338 c 1.08196,-1.373479 0.20222,0.05378 1.90155,-1.772373 1.16615,-0.946532 2.61177,-1.660207 6.15501,-2.683852 -1.41567,-1.31040893 -3.86109,-1.34569693 -5.24401,-0.402913 -1.16201,0.698454 -2.31277,2.023815 -2.81255,4.859139",
  path17: "m 166.5587,5.4354718 c -0.0253,0.383207 -0.4258,0.707685 -1.21957,0.666307 -0.79378,-0.04138 -1.24331,-0.410173 -1.21804,-0.793382 0.0253,-0.383209 0.51575,-0.635719 1.30954,-0.594338 0.79377,0.04138 1.15334,0.338206 1.12807,0.721413 z",
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

/** Plays the petals forward (unfurl) or backward (fold); `now` runs 0..UNFURL_MS or back. */
function move(s: Scene, forward: boolean, onTime: (now: number) => void) {
  return s.tween(
    UNFURL_MS,
    (u) => {
      const now = (forward ? u : 1 - u) * UNFURL_MS;
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
 * petals appear the moment they start to open. Safe to call again after `foldFlower`.
 */
export async function unfurlFlower(s: Scene) {
  tucked ??= fitInsideBud(s);
  growCenter(s, 0);
  s.show("flower-center"); // completely covered by the front petals
  const waiting = new Set(BACK);
  let top = false;
  await move(s, true, (now) => {
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

/** Open flower -> bud: `unfurlFlower` played backwards. */
export async function foldFlower(s: Scene) {
  s.show("flower-center");
  growCenter(s, 1);
  await s.hide("flower-center-top", TOP_FADE_MS);
  const back = new Set<string>();
  await move(s, false, (now) => {
    for (const id of BACK) {
      if (!back.has(id) && now <= UNFURL[id as keyof typeof UNFURL].at) {
        back.add(id);
        void s.hide(id); // tucked in again, behind the front petals
      }
    }
  });
  // back to the bud exactly as it was drawn: petals 2 and 3 show only their visible edge
  for (const st of flowerStrokes) if (st.draw) s.limit(st.id, st.draw);
}

// ---- test piece: draw the bud, unfurl it, then leave (see src/fab/pieces/index.ts) ----

const scale = Math.min(215 / flowerBounds.width, 215 / flowerBounds.height);

export const flower: Piece = {
  id: "flower",
  fit: {
    x: 150 - (flowerBounds.x + flowerBounds.width / 2) * scale,
    y: 150 - (flowerBounds.y + flowerBounds.height / 2) * scale,
    scale,
  },
  strokes: flowerStrokes,
  drawOrder: flowerDrawOrder,
  headOnTop: true,
  glow: 0.35,
  async act(s) {
    await s.wait(700); // the bud, as drawn
    await unfurlFlower(s);
    await s.wait(300);
  },
};
