import type { TransitionName } from "./types";

export const SVG_NS = "http://www.w3.org/2000/svg";
/** Side of the square stage viewBox (matches Fabricator.astro). */
export const STAGE_SIZE = 300;

/**
 * Every tunable number, in *stage units* (the stage is a 300x300 viewBox).
 * Because the engine converts each piece into stage units, a value here means
 * the same thing for every piece — a 12-unit stroke is as long on screen for
 * a bird as it is for the TV.
 */
export const CONFIG = {
  strokeWidth: 1.52,
  // Fabricator.astro hardcodes this value in the head's filter; keep in sync.
  glowBlur: 0.76,

  // drawing (20% quicker than the first version)
  drawMsPer100: 1150,
  minDrawMs: 560,
  maxDrawMs: 2800,

  travelMsPer100: 520,
  minTravelMs: 240,
  maxTravelMs: 900,

  /** The first version's pace (before the head was slowed down); a piece opts in with `Piece.pace`. */
  originalPace: {
    drawMsPer100: 820,
    minDrawMs: 400,
    maxDrawMs: 2080,
    travelMsPer100: 285,
    minTravelMs: 100,
    maxTravelMs: 560,
  },

  fillInMs: 260,
  // The fill is its own crisp layer (the glow only touches the outline). 0.58
  // is the strength the old glow-doubled 0.35 fill actually showed on screen.
  accentFillOpacity: 0.58,
  overrideFillOpacity: 1, // solid surface when a stroke sets fillColor

  defaultHoldMs: 1200,
  /** Extra time every piece's finished animation stays up before it leaves. */
  actExtraMs: 1000,

  /** Default exit: "collapse" (CRT switch-off into the laser dot), "fade" or "flyout". A piece can override it. */
  transition: "collapse" as TransitionName,
  fadeMs: 450,
  collapseSquashMs: 240,
  collapseShrinkMs: 190,
  /** "flyout": the piece accelerates away to the right and out of the component. */
  flyOutMs: 1900,

  headSpinDegPerSec: 90,
  /** The laser head fades out over this long when it is not needed (it never just vanishes). */
  headFadeMs: 700,
  /** ...and fades back in over this long when it is needed again (after page load, or between pieces). */
  headFadeInMs: 650,
};
