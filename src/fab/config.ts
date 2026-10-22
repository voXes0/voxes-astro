export const SVG_NS = "http://www.w3.org/2000/svg";
/** Side of the square "home" view; the stage itself is any shape (viewport.ts). */
export const STAGE_SIZE = 300;

/**
 * Every tunable number, in *stage units* (300 span the shorter side of the stage, roughly).
 * Because the engine converts each piece into stage units, a value here means
 * the same thing for every piece — a 12-unit stroke is as long on screen for
 * a bird as it is for the TV.
 */
export const CONFIG = {
  strokeWidth: 1.52,
  /** Fabricator.astro hardcodes this in the head's filter; keep in sync. */
  glowBlur: 0.76,
  /** Line weights follow the camera zoom only once it has moved this fraction: 1.5% on a line is invisible, and each re-weigh costs a style pass. */
  zoomTolerance: 0.015,

  // drawing
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
  /** The fill is its own crisp layer, so this matches what the old glow-doubled 0.35 looked like. */
  accentFillOpacity: 0.58,
  overrideFillOpacity: 1, // solid surface when a stroke sets fillColor

  headSpinDegPerSec: 90,
  /** The laser head fades out over this long when it is not needed (it never just vanishes). */
  headFadeMs: 700,
  /** ...and fades back in over this long when it is needed again (after page load, or between pieces). */
  headFadeInMs: 650,
};
