import { flapPoses, lookAround, tuckLegs } from "../acts";
import type { Actor, Chapter, Director } from "../director";
import { dripOnPetal, type DripFrame } from "../drip";
import { fly } from "../flight";
import { createPond } from "../pond";
import { createSpring, extentOf, outlineOf, startRain, type Surface } from "../rain";
import { bendPath, createStem, type Stem } from "../stem";
import { abortError } from "../timing";
import type { FabStroke, Piece, Point } from "../types";
import { pivots as birdPivots, strokes as birdStrokes } from "./bird.strokes";
import { cloudAt, cloudPiece } from "./cloud";
import { flowerBase, flowerBounds, flowerDrawOrder, flowerStrokes, unfurlFlower } from "./flower";
import {
  birdOrigin,
  birdPivot,
  flowerOffset,
  flyPath,
  groundStrokes,
  plantStrokes,
  puddleStrokes,
} from "./scene.strokes";
import { igniteSun, sun } from "./sun";

/**
 * Chapter 1: the bird, the flower and the sun. One continuous shot.
 *
 *   1. Ground and puddle are simply there. The laser draws the bird.
 *   2. The bird glances about, folds its legs and takes off, flapping, along the drawn
 *      path (roughly: see flight.ts). The camera follows it; as it heads for the far
 *      flower it shrinks into the picture, and the camera eases to a stop where the
 *      flower is going to be. The bird flies on, out of frame.
 *   3. The laser head appears at the foot of the stem and draws the stem, the leaves and the
 *      bud. Then it draws the sun in the top left of the frame.
 *   4. The sun lights up (rays, spinning halo, bloom). While it runs, the bud unfurls.
 *   5. 1.2 s after the flower has fully opened the laser draws a cloud above it, its rain
 *      starting right above the middle of the left petal. When the cloud is drawn it rains
 *      (src/fab/rain.ts): drops fall only under the cloud; on the ground, the petals and the
 *      leaves they splash, and a petal or leaf they hit dips and rings back up.
 *   6. 2.4 s into the rain the camera glides in on the left petal (zooming). One raindrop
 *      lands on it, forms a bead that slides down the petal, hangs from its tip and lets go
 *      (src/fab/drip.ts); the camera follows it down, pulling back, to the water, where it
 *      makes the baked splash of art/splash.json (src/fab/pond.ts).
 *   7. 1.5 s after the splash the camera pans slowly back to the start while the sun, cloud,
 *      plant and flower fade and the rain stops. Then it all plays again: the ground and the
 *      water stay; everything else is drawn again.
 *
 * The plant stands a little left of where it was drawn (`PLANT_SHIFT`) so the drop that rolls off
 * the left petal falls clear of the hill. The stem is not rigid: drops landing on the petals and
 * leaves bend it (src/fab/stem.ts), and the flower and leaves lean with it.
 *
 * Everything is in the drawing's own coordinates (scene.strokes.ts, generated from
 * art/scene-1.svg by `pnpm fab:scene`); the flower is placed with `flowerOffset`.
 */

/** Camera framing. `view` is how many world units fit across the stage. */
const VIEW = 156;
const START: Point = { x: 80, y: 92 }; // the bird, low in frame, with the ground
/** The bird stands this far left of where the drawing puts it, for a longer flight (the path moves with it). */
const BIRD_SHIFT: Point = { x: -24, y: 0 };
const HALT: Point = { x: 197, y: 58 }; // the flower mid-frame, the sun in the top left

/**
 * The plant (stem, leaves, flower) is drawn this far from where the art has it: left, off the
 * hill's summit onto its shoulder, so that the drop that falls off the left petal is clear of
 * the hill's wall. (`y` keeps its foot on the ground: the hill is steep there.)
 */
const PLANT_SHIFT: Point = { x: -6, y: 2.2 };
/** Where the flower's own drawing sits in the world. */
const FLOWER_AT: Point = { x: flowerOffset.x + PLANT_SHIFT.x, y: flowerOffset.y + PLANT_SHIFT.y };
/** The stem, in the world: its foot on the hill, and its top (where the petals meet). */
const STEM_FOOT: Point = { x: 220.416 + PLANT_SHIFT.x, y: 93.216 + PLANT_SHIFT.y };
const STEM_TOP: Point = { x: 212.274 + PLANT_SHIFT.x, y: 59.065 + PLANT_SHIFT.y };
/** Where the leaves join the stem (in the plant's own coordinates). */
const LEAF_BASES: Record<string, Point> = {
  "leaf-1": { x: 216.184, y: 72.81 },
  "leaf-2": { x: 214.995, y: 69.007 },
};

/**
 * The laser goes to the plant when the bird has flown this far (world x). The camera has all
 * but come to rest by then and the bird leaves the frame at about x = 285: about 3 s sooner
 * than waiting for the bird to be gone and the camera to settle.
 */
const PLANT_START_X = 251;
/** The cloud is drawn this long after the flower has finished opening. */
const CLOUD_DELAY_MS = 700;
/** Height (world y) of the cloud's flat underside, where the rain starts. */
const CLOUD_BASE_Y = 32;
/**
 * The cloud sits this far left of the middle of petal 2 (world units): there the leftmost rain
 * falls on petal 2's own top edge. Further right, petal 4 (behind it, higher) is what the
 * rain lands on first.
 */
const CLOUD_NUDGE_LEFT = 2;

/** The camera starts to push in on petal 2 this long after the rain began. */
const ZOOM_AFTER_RAIN_MS = 3500;
const PETAL_SHOT = { x: 199.5, y: 54.5, across: 34 };
const PETAL_SHOT_MS = 2200;
/** The raindrop that matters lands this far right of the cloud's left edge: on petal 2's exposed top edge. */
const HERO_OFFSET = 0.3;
/** The water: its line (from the puddle drawing), the wall of the hill at its right end, where the drop lands. */
const WATER = { x0: 110.212, x1: 198.63, level: 140.317 };
const LAND_X = 188;
/** The bead of water on the petal (radius, world units). The splash is made at the scale of the drop that falls from it. */
const BEAD_RADIUS = 0.6;
/** The camera's last framing: the splash, a little left of centre so the hill's wall is in view too. */
const SPLASH_SHOT = { x: 185.5, y: WATER.level - 6.5, across: 30 };
/** After the splash lands, this long before the camera starts back; then it takes this long. */
const HOLD_AFTER_SPLASH_MS = 1500;
const PAN_BACK_MS = 6500;

/** The laser starts this long after the chapter does (the page has just loaded). */
const START_DELAY_MS = 1000;
/** The ground and the puddle fade in over this long instead of being there at once. */
const SET_FADE_MS = 900;

const world = { x: 0, y: 0, scale: 1 };

const ground: Piece = { id: "ground", fit: world, strokes: groundStrokes, glow: 0, line: 0.85 };

const puddle: Piece = {
  id: "puddle",
  fit: world,
  // the water is a low-opacity fill from the line down to the ground
  strokes: puddleStrokes.map((s) => (s.id === "puddle-fill" ? { ...s, fillColor: "var(--low-opacity-secondary)" } : s)),
  glow: 0,
  line: 0.8,
  color: "var(--soft-secondary)",
};

const bird: Piece = {
  id: "bird",
  fit: { x: birdOrigin.x + BIRD_SHIFT.x, y: birdOrigin.y + BIRD_SHIFT.y, scale: 1 },
  // The legs are drawn from the foot up (reversed drawing; the path data is untouched)
  // The body's outline starts (and ends) at the node nearest the left leg.
  strokes: birdStrokes.map((st) =>
    st.id.startsWith("leg-line")
      ? { ...st, reverse: true }
      : st.id === "body"
        ? { ...st, d: startClosedPathNear(st.d, firstPoint(birdStrokes.find((q) => q.id === "leg-line-1")!.d)) }
        : st,
  ),
  // Drawn feet-first: the left foot, the left leg, the right foot, the right leg, the body, then
  // the rest. (The stacking order stays the drawing's: the body is behind the legs.)
  drawOrder: [
    "feet-line-1", "feet-line-2", "feet-line-3", "leg-line-1",
    "feet-line-4", "feet-line-5", "feet-line-6", "leg-line-2",
    "body", "eye", "pupil", "tail-line-2", "tail-line-1", "wing",
  ],
  pivots: birdPivots,
  glow: 0.35,
  line: 0.8,
  pace: "original", // the bird is drawn at the first, quicker pace; the rest of the scene is calmer
};

const plant: Piece = {
  id: "plant",
  fit: { x: PLANT_SHIFT.x, y: PLANT_SHIFT.y, scale: 1 },
  glow: 0.6,
  line: 0.85,
  strokes: plantStrokes.map((s) =>
    s.id.endsWith("-vein") ? { ...s, line: 0.4 } : s.id.startsWith("leaf") ? { ...s, line: 0.65 } : s,
  ),
};

const flower: Piece = {
  id: "flower",
  fit: { x: FLOWER_AT.x, y: FLOWER_AT.y, scale: 1 },
  strokes: flowerStrokes,
  drawOrder: flowerDrawOrder,
  headOnTop: true, // the petals have opaque fills
  glow: 0.5,
  line: 0.7,
  extent: flowerBounds,
};

/** The first point of a path ("M x y ..."). */
function firstPoint(d: string): Point {
  const m = d.match(/M\s*(-?\d*\.?\d+)[\s,]+(-?\d*\.?\d+)/)!;
  return { x: parseFloat(m[1]), y: parseFloat(m[2]) };
}

/**
 * Rewrite a closed path (absolute M, L, C and Z commands) so that it starts, and so also ends, at
 * its own node nearest `to`: the laser begins and finishes the outline there. The shape is unchanged.
 */
function startClosedPathNear(d: string, to: Point): string {
  const cmds = [...d.matchAll(/([MLCZ])([^MLCZ]*)/g)].map((m) => ({
    c: m[1],
    n: m[2].trim().split(/[\s,]+/).filter(Boolean).map(Number),
  }));
  const start = { x: cmds[0].n[0], y: cmds[0].n[1] };
  const segs = cmds.slice(1).filter((t) => t.c !== "Z");
  const endOf = (t: { n: number[] }) => ({ x: t.n[t.n.length - 2], y: t.n[t.n.length - 1] });
  if (Math.hypot(endOf(segs[segs.length - 1]).x - start.x, endOf(segs[segs.length - 1]).y - start.y) > 1e-6) {
    segs.push({ c: "L", n: [start.x, start.y] }); // the closing line, made explicit
  }
  let best = segs.length - 1; // (the last node is the start itself)
  let bestD = Math.hypot(start.x - to.x, start.y - to.y);
  segs.forEach((t, i) => {
    const e = endOf(t);
    const dist = Math.hypot(e.x - to.x, e.y - to.y);
    if (dist < bestD - 1e-9) {
      bestD = dist;
      best = i;
    }
  });
  if (best === segs.length - 1) return d;
  const first = endOf(segs[best]);
  const order = [...segs.slice(best + 1), ...segs.slice(0, best + 1)];
  return `M${first.x} ${first.y} ${order.map((t) => `${t.c}${t.n.join(" ")}`).join(" ")} Z`;
}

/** Holds the rain's drops and splashes (they are generated, not strokes): see rain.ts. */
const rainLayer: Piece = { id: "rain", fit: world, strokes: [], glow: 0 };

/** The open (last) pose of a stroke: what a petal looks like once the flower has unfurled. */
const openShape = (s: FabStroke) => (s.poses?.length ? s.poses[s.poses.length - 1].d : s.d);

/** Fade a piece that is already placed in from nothing. */
async function fadeIn(actor: Actor, ms: number) {
  const el = actor.layer.wrapper;
  el.style.opacity = "0";
  const a = el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: ms, easing: "ease-out", fill: "forwards" });
  try {
    await a.finished;
  } finally {
    a.cancel();
    el.style.opacity = "";
  }
}

const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));
/** Smooth minimum: like Math.min, but rounds the corner over about `k` units (a camera that eases to a halt). */
const softMin = (a: number, b: number, k: number) => -k * Math.log(Math.exp(-a / k) + Math.exp(-b / k));

/** Run `step` every frame until it returns true (or `maxMs` pass). */
/** Fade an actor out, then remove it. */
async function fadeOut(actor: Actor, ms: number) {
  const el = actor.layer.wrapper;
  const a = el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: ms, easing: "ease-in-out", fill: "forwards" });
  try {
    await a.finished;
  } finally {
    actor.remove();
  }
}

function frames(d: Director, step: (dt: number) => boolean, maxMs = 4000): Promise<void> {
  return new Promise((resolve, reject) => {
    let last = performance.now();
    const t0 = last;
    const tick = (now: number) => {
      if (d.signal.aborted) return reject(abortError());
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (step(dt) || now - t0 > maxMs) return resolve();
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}

/**
 * What the rain can land on, from the real shapes: the five open petals and the two leaves
 * (each hinged at its base, so a drop can knock it), and the hill. Silhouettes are taken from the
 * stroke data, not from what is on screen, so they are the same wherever the camera is.
 *
 * Petals and leaves grow on the stem, which gives: a drop that knocks one bends the stem too
 * (`also`), and where the surface really is depends on how far the stem has leaned (`carry`).
 */
function rainSurfaces(flowerActor: Actor, plantActor: Actor, stem: Stem): Surface[] {
  const out: Surface[] = [];
  const reachOf = (pts: Point[], p: Point) => Math.max(...pts.map((q) => Math.hypot(q.x - p.x, q.y - p.y)));
  const turned = (p: Point, about: Point, a: number): Point => {
    const c = Math.cos(a);
    const sn = Math.sin(a);
    return { x: about.x + (p.x - about.x) * c - (p.y - about.y) * sn, y: about.y + (p.x - about.x) * sn + (p.y - about.y) * c };
  };
  /** What leaning does to something joined to the stem at `at`: turned by the stem's slope there, and moved sideways. */
  const leaning = (at: Point) => (p: Point): Point => {
    const q = turned(p, at, stem.turnAt(at.y));
    return { x: q.x + stem.shiftAt(at.y), y: q.y };
  };

  // petals: all hinged at the top of the stem
  const hinge = { x: FLOWER_AT.x + flowerBase.x, y: FLOWER_AT.y + flowerBase.y };
  for (const st of flowerStrokes) {
    if (!/^flower-petal-\d$/.test(st.id)) continue;
    const pts = outlineOf(openShape(st), FLOWER_AT);
    const wrapper = flowerActor.scene.stroke(st.id).parentElement!;
    out.push({
      id: st.id,
      kind: "petal",
      pts,
      also: [stem.spring],
      carry: leaning(hinge),
      carryTurn: () => stem.turnAt(hinge.y),
      body: createSpring({
        targets: [wrapper],
        pivot: hinge,
        pivotLocal: flowerBase,
        reach: reachOf(pts, hinge),
        freqHz: 3.4, // a light petal on a stiff base: a few quick swings
        zeta: 0.24, // the first dip is followed by a rebound about half as big, then a smaller one
      }),
    });
  }

  // leaves: a little stiffer; the vein turns with its leaf
  for (const [id, base] of Object.entries(LEAF_BASES)) {
    const st = plantStrokes.find((q) => q.id === id)!;
    const at = { x: base.x + PLANT_SHIFT.x, y: base.y + PLANT_SHIFT.y };
    const pts = outlineOf(st.d, PLANT_SHIFT);
    out.push({
      id,
      kind: "leaf",
      pts,
      also: [stem.spring],
      carry: leaning(at),
      carryTurn: () => stem.turnAt(at.y),
      body: createSpring({
        targets: [plantActor.scene.stroke(id).parentElement!, plantActor.scene.stroke(`${id}-vein`).parentElement!],
        pivot: at,
        pivotLocal: base,
        reach: reachOf(pts, at),
        freqHz: 4.4,
        zeta: 0.3,
        maxDeg: 10,
        // the leaf rides on the stem: it is moved and turned with it, as well as swinging on its own
        carry: () =>
          `translate(${stem.shiftAt(at.y).toFixed(3)} 0) rotate(${((stem.turnAt(at.y) * 180) / Math.PI).toFixed(3)} ${base.x} ${base.y})`,
      }),
    });
  }

  out.push({ id: "ground", kind: "ground", pts: outlineOf(groundStrokes[0].d, { x: 0, y: 0 }, 0.5) });
  return out;
}

export const birdToFlower: Chapter = {
  id: "bird-to-flower",
  view: VIEW,

  async run(d) {
    const { camera } = d;
    camera.set(START.x, START.y);
    camera.drift(1.6); // never quite still

    // 1. the set fades in; one second after the page loaded the laser starts on the bird.
    //    The water goes in first so the ground is drawn over its edges.
    const water = d.add(puddle);
    water.place();
    const land = d.add(ground);
    land.place();
    void Promise.all([fadeIn(water, SET_FADE_MS), fadeIn(land, SET_FADE_MS)]).catch(() => {});
    await d.wait(START_DELAY_MS);

    // for the drop: the water's body as drawn (the splash reshapes it) and the hill's wall above the water
    const fillBase = puddleStrokes.find((st) => st.id === "puddle-fill")!.d.replace(/\s*Z\s*$/, "");
    const hill = outlineOf(groundStrokes[0].d, { x: 0, y: 0 }, 0.5);
    const wallAt = (y: number) => {
      let best = Infinity;
      for (let i = 0; i < hill.length - 1; i++) {
        const p = hill[i];
        const q = hill[i + 1];
        if (p.x < 190 || p.x > 215 || (p.y - y) * (q.y - y) > 0 || p.y === q.y) continue;
        best = Math.min(best, p.x + ((q.x - p.x) * (y - p.y)) / (q.y - p.y));
      }
      return best === Infinity ? 215 : best;
    };

    // The ground and the water stay; everything else is drawn again each round.
    for (let round = 0; ; round++) {
      const birdActor = d.add(bird);
      d.state("building");
      d.beat("draw-bird");
      await birdActor.build(null);

      // 2. a look round, then take off
      d.state("acting");
      d.beat("take-off");
      const b = birdActor.scene;
      await lookAround(b, "pupil", "eye", [
        { x: -1, y: -0.25, holdMs: 300 },
        { x: 1, y: 0.05, holdMs: 0 },
      ]);
      const wings = { startedAt: performance.now(), periodMs: 380 };
      b.spawn(() => flapPoses(b, "wing", { flaps: Infinity, periodMs: wings.periodMs }));
      const legsUp = tuckLegs(
        b,
        [
          { leg: "leg-line-1", feet: ["feet-line-1", "feet-line-2", "feet-line-3"] },
          { leg: "leg-line-2", feet: ["feet-line-4", "feet-line-5", "feet-line-6"] },
        ],
        { behind: "body" },
      );

      // the camera chases a point just ahead of and below the bird, and eases to a halt at the flower
      const follow = (p: Point): Point => ({
        x: softMin(Math.max(p.x + 16, START.x), HALT.x, 7),
        y: clamp(p.y + 14, HALT.y, START.y),
      });
      d.beat("flight");
      let launchPlant!: () => void;
      const plantGo = new Promise<void>((resolve) => (launchPlant = resolve));
      // The flight (and the camera coming to rest after it) carries on by itself while the laser
      // moves on to the plant, which it does as soon as the bird has got far enough.
      const flightTask = (async () => {
        await Promise.all([
          legsUp,
          fly({
            path: flyPath,
            offset: BIRD_SHIFT,
            el: birdActor.layer.wrapper,
            rest: { x: birdPivot.x + BIRD_SHIFT.x, y: birdPivot.y + BIRD_SHIFT.y },
            signal: d.signal,
            wings,
            onFrame: (pos, _scale, dt) => {
              camera.chase(follow(pos), dt, 2.6);
              if (pos.x >= PLANT_START_X) launchPlant();
            },
          }),
        ]);
        birdActor.remove(); // out of frame by now
        launchPlant(); // (if the bird was quicker than the trigger)
        // the camera comes to rest where the flower will be
        await frames(d, (dt) => {
          camera.chase(HALT, dt, 1.8);
          return camera.settled(HALT, 0.2);
        });
      })();
      flightTask.catch(() => {}); // an abort is handled where it is awaited; do not report it twice

      // 3. the laser head appears (fading in) at the foot of the stem and builds the plant and the
      //    flower; then it draws the sun
      await Promise.race([plantGo, flightTask]);
      d.state("building");
      d.beat("draw-flower");
      const plantActor = d.add(plant);
      let at: Point | null = await plantActor.build(null);
      const flowerActor = d.add(flower);
      at = await flowerActor.build(at);
      d.beat("draw-sun");
      const sunActor = d.add(sun);
      await sunActor.build(at);
      await flightTask; // long done, but nothing may be left running

      // 4. the sun lights up; the bud opens
      d.state("acting");
      d.beat("sun-on");
      await igniteSun(sunActor.scene);
      d.beat("unfurl");
      await unfurlFlower(flowerActor.scene);
      d.beat("flower-open");

      // 5. a cloud over the flower, then rain. Its rain starts a hair left of the middle of petal 2.
      await d.wait(CLOUD_DELAY_MS);
      const petal2Shape = flowerStrokes.find((st) => st.id === "flower-petal-2")!;
      const rainFrom = extentOf(outlineOf(openShape(petal2Shape), FLOWER_AT)).cx - CLOUD_NUDGE_LEFT;
      const cloud = cloudAt(rainFrom, CLOUD_BASE_Y);
      d.beat("draw-cloud");
      d.state("building");
      const cloudActor = d.add(cloudPiece(cloud));
      await cloudActor.build(null);

      d.state("acting");
      d.beat("rain");
      const fx = d.add(rainLayer);

      // the stem: it gives when the drops hit what grows on it. Its path is redrawn, and the flower
      // (and the leaves, through their springs) are moved with it, as it bends.
      const stem = createStem({ foot: STEM_FOOT, top: STEM_TOP, freqHz: 1.8, zeta: 0.3, gain: 0.035, maxTip: 1.6 });
      const stemPath = plantStrokes.find((st) => st.id === "stem")!.d;
      const hinge = { x: FLOWER_AT.x + flowerBase.x, y: FLOWER_AT.y + flowerBase.y };
      let leant = 0;
      const lean = (force = false) => {
        if (!force && Math.abs(stem.tip - leant) < 1e-3) return;
        leant = stem.tip;
        plantActor.scene.setPath("stem", bendPath(stemPath, (y) => stem.shiftAt(y + PLANT_SHIFT.y)));
        const turn = (stem.turnAt(hinge.y) * 180) / Math.PI;
        flowerActor.layer.wrapper.setAttribute("transform", `translate(${stem.shiftAt(hinge.y).toFixed(3)} 0) rotate(${turn.toFixed(3)} ${hinge.x} ${hinge.y})`);
      };
      const straighten = () => {
        stem.spring.reset();
        plantActor.scene.setPath("stem", stemPath);
        flowerActor.layer.wrapper.removeAttribute("transform");
        leant = 0;
      };

      const surfaces = rainSurfaces(flowerActor, plantActor, stem);
      const petal2 = surfaces.find((sf) => sf.id === "flower-petal-2")!;
      const rain = startRain({
        onStep: () => lean(),
        host: fx.layer.group,
        signal: fx.scene.signal,
        zoom: () => camera.zoom,
        from: cloud.rainFrom,
        to: cloud.rainTo,
        y: cloud.base,
        surfaces,
      });

      // 6. 2.4 s into the rain the camera glides in on the left petal ...
      await d.wait(ZOOM_AFTER_RAIN_MS);
      d.beat("zoom-petal");
      rain.avoid("flower-petal-2"); // the one drop that matters gets the petal to itself
      await camera.moveTo(PETAL_SHOT, PETAL_SHOT_MS);
      // The sun and the cloud are out of the shot now; not drawing them keeps the close-up smooth
      // (their glow is the costliest thing in the picture once the camera is this far in).
      sunActor.layer.wrapper.style.display = "none";
      cloudActor.layer.wrapper.style.display = "none";
      await d.wait(250);

      // ... a raindrop lands on it, makes a bead, which slides down, hangs and falls to the water;
      // the camera follows, pulling back
      d.beat("raindrop");
      let letGo = false;
      const trail = (f: DripFrame) => {
        if (f.phase === "bead" || f.phase === "slide" || f.phase === "hang") {
          camera.chase({ x: f.x - 0.5, y: f.y - 1 }, f.dt, 2.2); // keeps the bead in view, gently
        } else if (f.phase === "drop") {
          if (!letGo) {
            letGo = true;
            rain.avoid(null);
            d.beat("fall");
          }
          const k = clamp(f.u, 0, 1);
          const e = k * k * (3 - 2 * k);
          // it pulls back a little on the way down (to see the fall) and comes in close for the water
          camera.setAcross(PETAL_SHOT.across + (SPLASH_SHOT.across - PETAL_SHOT.across) * e + 12 * Math.sin(Math.PI * k));
          camera.chase(
            { x: f.x + (SPLASH_SHOT.x - f.x) * e, y: softMin(f.y + 0.42 * f.vy, SPLASH_SHOT.y, 6) },
            f.dt,
            8,
          );
        }
      };
      const landing = await dripOnPetal({
        host: fx.layer.group,
        signal: fx.scene.signal,
        zoom: () => camera.zoom,
        rain,
        petal: petal2,
        x: cloud.rainFrom + HERO_OFFSET,
        radius: BEAD_RADIUS,
        water: { x: LAND_X, level: WATER.level, wallAt },
        onFrame: trail,
      });

      // the splash (art/splash.json) on the real water line
      d.beat("splash");
      const pond = createPond({
        host: fx.layer.group,
        signal: fx.scene.signal,
        zoom: () => camera.zoom,
        ...WATER,
        wallAt,
        setLine: (path) => water.scene.setPath("puddle", path),
        setFill: (path) => water.scene.setPath("puddle-fill", path),
        fillBase,
      });
      const splashed = pond.splash(landing.x, landing.radius);
      splashed.catch(() => {});
      let held = 0;
      await frames(
        d,
        (dt) => {
          camera.chase(SPLASH_SHOT, dt, 4);
          held += dt * 1000;
          return held >= HOLD_AFTER_SPLASH_MS;
        },
        HOLD_AFTER_SPLASH_MS + 1000,
      );

      // 7. 1.5 s after the splash: a slow pan back to the start, while the scene resets behind it
      d.beat("pan-back");
      sunActor.layer.wrapper.style.display = "";
      cloudActor.layer.wrapper.style.display = "";
      rain.setRate(0);
      const clearSky = (async () => {
        await d.wait(600);
        await Promise.all([fadeOut(sunActor, 1800), fadeOut(cloudActor, 1800)]);
      })();
      const reset = (async () => {
        await splashed; // the water is still again
        await d.wait(900);
        straighten(); // the stem is still: put it, and everything it carries, back exactly
        rain.stop();
        fx.remove();
        // the plant and the flower are erased too: the next round draws them again
        await Promise.all([fadeOut(plantActor, 1500), fadeOut(flowerActor, 1500)]);
      })();
      await Promise.all([
        camera.moveTo({ x: START.x, y: START.y, across: VIEW }, PAN_BACK_MS),
        clearSky,
        reset,
      ]);
      camera.frame(START.x, START.y, VIEW);
    }
  },

  // reduced motion: the finished scene, standing still
  still(d) {
    d.camera.set(HALT.x, HALT.y);
    d.add(puddle).place();
    d.add(ground).place();
    d.add(plant).place();
    d.add(flower).place();
    const s = d.add(sun);
    s.place();
    s.scene.show("sun-bloom");
  },
};
