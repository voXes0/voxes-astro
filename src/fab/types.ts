/**
 * Shared types for the fabricator. A *piece* is a drawing the laser builds
 * stroke by stroke (a TV, a bird, a water drop...). Pieces are mostly data;
 * anything that moves after the drawing exists lives in the piece's `act`.
 */

/** How a finished piece leaves the stage (see transitions.ts). */
export type TransitionName = "fade" | "collapse" | "flyout";

export interface Point {
  x: number;
  y: number;
}

/**
 * How a piece's own coordinate space maps onto the 300x300 stage:
 * `translate(x,y) scale(scale)`. Keeping this per piece (instead of baking
 * coordinates) means path data stays exactly as exported from Inkscape, while
 * the engine still works in stage units (see config.ts).
 */
export interface Fit {
  x: number;
  y: number;
  scale: number;
}

export interface FabStroke {
  /** Stable name — what `scene.stroke(id)` and acts refer to. */
  id: string;
  /** Path data in the piece's own coordinate space. */
  d: string;
  /** Closed shapes fade their fill in after the outline is drawn. */
  fill?: boolean;
  /** Fill color override (defaults to currentColor), e.g. "var(--background)". */
  fillColor?: string;
  /**
   * Other shapes of this same stroke, e.g. a raised wing: `{ at: 100, d }`.
   * `d` above is the pose at 0 (what the laser draws). Every pose must have the
   * identical node structure, which the importer checks. Acts blend between
   * them with `scene.pose(id, amount)`; nothing is drawn for them.
   */
  poses?: { at: number; d: string }[];
  /**
   * The laser draws only this part of the outline: `[from, to]` as fractions of
   * the path length (default `[0, 1]`). The rest stays undrawn until an act
   * reshapes the stroke (`scene.pose` / `scene.setPath`), which shows all of it.
   * For a shape whose other part is hidden behind something at first.
   */
  draw?: [number, number];
  /**
   * The laser draws this stroke from its end back to its start (a leg drawn from the foot up).
   * Only the drawing is reversed; the path data (and what acts do with it) stays as it is.
   */
  reverse?: boolean;
  /**
   * Not drawn by the laser at all: the stroke exists, finished, from the start
   * (so it keeps its place in the stacking order and can be covered by what is
   * drawn after it) but stays invisible until an act calls `scene.show(id)`.
   */
  hidden?: boolean;
  /**
   * `false`: a fill-only shape (no outline, no glow), e.g. a soft bloom filled with a
   * gradient. Use it with `hidden`: the laser has nothing to draw on it.
   */
  outline?: boolean;
  /** Line weight of this stroke on top of `Piece.line` (e.g. 0.5 for a leaf's vein). */
  line?: number;
}

export interface OverlaySpec {
  d: string;
  /** SVG transform placing the shape on the *stage* (not the piece space). */
  transform?: string;
  fill?: string;
}

/** What a piece's `act` can touch. Everything it creates or changes is undone for it. */
export interface Scene {
  readonly signal: AbortSignal;
  /** The drawn element of a stroke, by id. Only valid during the act. */
  stroke(id: string): SVGPathElement;
  /** A named point in the piece's coordinate space (see Piece.pivots). */
  pivot(name: string): [number, number];
  /**
   * Blend a stroke between its `poses`: 0 is the drawn shape, 100 the last pose.
   * Restored to the drawn shape when the piece is torn down.
   */
  pose(id: string, amount: number): void;
  /** Make `hidden` strokes visible, optionally fading in over `fadeMs`. */
  show(ids: string | string[], fadeMs?: number): void;
  /**
   * Show only part of a stroke's outline again, as `FabStroke.draw` does. For
   * putting a reshaped stroke back to how it was drawn. Any `pose`/`setPath` shows all of it.
   */
  limit(id: string, range: [number, number]): void;
  /** Hide strokes again (`show`'s opposite), optionally fading out first. Resolves when done. */
  hide(ids: string | string[], fadeMs?: number): Promise<void>;
  /** Replace a stroke's shape (outline and fill), e.g. a leg that bends. Restored on teardown. */
  setPath(id: string, d: string): void;
  /**
   * Hide the parts of these strokes that lie inside another stroke's shape, as if
   * they were behind it (a tucked leg behind the body). The hiding fades in over
   * `fadeMs` so nothing pops. Removed on teardown.
   */
  hideBehind(ids: string[], behindId: string, fadeMs?: number): void;
  /**
   * Start something that keeps running on its own (e.g. wings that flap until the
   * piece leaves). It is stopped when the piece is torn down, and abort errors
   * are swallowed, so the task never needs to clean up either.
   */
  spawn(task: () => Promise<void>): void;
  /** The stage's own <svg>, for measuring where the piece is on screen. */
  readonly stage: SVGSVGElement;
  /** Call `onFrame` with 0..1 over `ms` (linear unless `ease` is given). */
  tween(
    ms: number,
    onFrame: (t: number) => void,
    ease?: (x: number) => number,
  ): Promise<void>;
  wait(ms: number): Promise<void>;
  /** Run a Web Animation and resolve when it finishes. */
  animate(
    target: Element,
    keyframes: Keyframe[],
    options: KeyframeAnimationOptions,
  ): Promise<void>;
  /** Start a Web Animation without waiting (e.g. an endless loop). */
  play(
    target: Element,
    keyframes: Keyframe[],
    options: KeyframeAnimationOptions,
  ): Animation;
  /** Add a non-stroke shape in stage space; returns the inner <g> to animate. */
  overlay(spec: OverlaySpec): SVGGElement;
}

export interface Piece {
  id: string;
  fit: Fit;
  /**
   * Array order is the STACKING order (later = in front) and, unless `drawOrder`
   * is given, also the order the laser draws in.
   */
  strokes: FabStroke[];
  /**
   * Stroke ids in the order the laser draws them, when that differs from the
   * stacking order (e.g. the front petal is drawn first but stays in front).
   * Must list every stroke that is not `hidden`, once.
   */
  drawOrder?: string[];
  /**
   * Keep the laser head painted above the strokes while this piece is on stage.
   * Needed when strokes have an opaque fill, which would otherwise cover it.
   */
  headOnTop?: boolean;
  /**
   * Strength of the outline glow relative to the TV's: 0 = crisp lines, 1 = the
   * original look (default). One number per piece, no per-stroke surprises.
   */
  glow?: number;
  /**
   * Line weight relative to CONFIG.strokeWidth (default 1). For small or delicate
   * pieces (leaves, a flower) that a full-weight line would swallow.
   */
  line?: number;
  /** `"original"`: the laser draws this piece at the first version's (quicker) pace; default: CONFIG's. */
  pace?: "original";
  /** CSS colour of the piece's strokes and fills (default: the stage's `color`). */
  color?: string;
  /**
   * A box (piece space) the piece's strokes may grow into later, e.g. where an open
   * flower reaches. The glow filter region covers it, so nothing is clipped there.
   */
  extent?: { x: number; y: number; width: number; height: number };
  /** Named points in piece space, e.g. wing shoulders (from Inkscape markers). */
  pivots?: Record<string, [number, number]>;
  /**
   * Runs once the piece is fully drawn. Whatever it does is undone when the
   * piece is torn down after its transition (animations cancelled, overlays
   * removed, strokes reshaped back), so acts never clean up after themselves.
   */
  act?: (scene: Scene) => Promise<void>;
  /** Pause on the finished piece when there is no `act`. */
  holdMs?: number;
  /** How this piece leaves; defaults to CONFIG.transition. */
  transition?: TransitionName;
}
