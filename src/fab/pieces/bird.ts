import { flapPoses, lookAround, tuckLegs } from "../acts";
import type { Piece } from "../types";
import { fit, pivots, strokes } from "./bird.strokes";

/**
 * Drawing data is generated from art/bird.svg (see bird.strokes.ts).
 * Only what moves lives here:
 *   1. it glances around (back, down, up) and settles looking forward (+x);
 *   2. it takes off: the wings start beating and keep beating for as long as the
 *      bird is on screen (a background task, stopped when the piece is torn
 *      down), while the legs fold up into the body;
 *   3. it flies out of the component (the "flyout" transition) — wings still going.
 */
export const bird: Piece = {
  id: "bird",
  fit,
  strokes,
  pivots,
  glow: 0.35, // much subtler than the TV (1); 0 would be fully crisp
  transition: "flyout",
  async act(s) {
    await lookAround(s, "pupil", "eye", [
      { x: -1, y: -0.25, holdMs: 420 }, // back toward the tail
      { x: -0.5, y: 0.85, holdMs: 380 }, // down
      { x: 0.2, y: -0.95, holdMs: 360 }, // up
      { x: 1, y: 0.05, holdMs: 0 }, // forward, where it stays
    ]);
    s.spawn(() => flapPoses(s, "wing", { flaps: Infinity, periodMs: 700 }));
    await tuckLegs(
      s,
      [
        { leg: "leg-line-1", feet: ["feet-line-1", "feet-line-2", "feet-line-3"] },
        { leg: "leg-line-2", feet: ["feet-line-4", "feet-line-5", "feet-line-6"] },
      ],
      { behind: "body" },
    );
    await s.wait(1500); // flapping in place before it leaves
  },
};
