/**
 * Every tunable number of the flappy mini-game, in *world units*. The world is
 * a fixed 480x320 box that the <svg> scales to whatever size the component is
 * given, so a value here means the same thing on every screen.
 */
export const WORLD = {
  w: 480,
  h: 320,
  /** The ground line. Touching it ends the run. */
  floorY: 296,
  /** Pitch of the background grid (the fabricator's baseplate grid). */
  grid: 28,
  /** Ground line dash and gap; its scroll wraps at their sum, so keep them together. */
  groundDash: [14, 10] as const,
};

export const BIRD = {
  /** Fixed horizontal position of the bird on screen; the world scrolls instead. */
  x: 120,
  /** Starting height of the bird. */
  startY: WORLD.h * 0.42,
  /** Hitbox radius. Smaller than the drawn body on purpose: near misses feel fair. */
  r: 12,
  /** Drawn width of the bird. */
  width: 52,
  /** Width of the bird art in its own coordinate space (art/bird.svg; re-measure if redrawn). */
  artWidth: 60.2,
  /** Where the middle of the body is, in the bird art's own coordinate space. */
  center: { x: 31, y: 19 },
  /** Outline width in world units (the fabricator's hairline is too thin at this size). */
  strokeWidth: 1.6,
};

export const PHYSICS = {
  gravity: 1150,
  /** Upward speed a flap sets (not adds: flapping is always the same hop). */
  flap: 340,
  maxFall: 560,
  /** Fixed simulation step, so the game plays the same at any frame rate. */
  step: 1 / 120,
};

export const PIPE = {
  w: 54,
  capW: 66,
  capH: 16,
  radius: 3,
};

export const WING = {
  /** Same shape of beat as the fabricator's flapPoses (up fast, down slow). */
  upFraction: 0.4,
  /** One flap, in ms, when the player taps. */
  flapMs: 280,
  /** Lazy beat while hovering before the start (the fabricator uses 700). */
  idleMs: 700,
};

export const FLOW = {
  /** After a crash or a win, ignore input this long so a panicked tap cannot skip the message. */
  endCooldownMs: 500,
  /** Pause before the message appears once the bird has stopped / left. */
  crashMessageMs: 500,
  winMessageMs: 900,
};

/** Cosmetic motion only: none of this affects gameplay. */
export const FEEL = {
  /** Idle bob while waiting to start. */
  bobPeriodMs: 320,
  bobAmplitude: 5,
  /** Bird tilt in degrees while playing: follows vertical speed, clamped. */
  tiltMin: -28,
  tiltMax: 75,
  tiltPerVy: 0.1,
  tiltOffset: -4,
  tiltCrashed: 90,
  tiltFinished: -14,
  /** How fast the tilt eases to its target (per second). */
  tiltEasePlaying: 12,
  tiltEaseCrashed: 6,
  /** Scenery drift while waiting to start, and the grid's parallax against the ground. */
  idleDriftSpeed: 24,
  gridParallax: 0.4,
  /** Wing beat period of the victory flap. */
  victoryBeatMs: 360,
};
