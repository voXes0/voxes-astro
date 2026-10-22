/**
 * Shared types. A *piece* is a drawing the laser builds stroke by stroke. Pieces are mostly data;
 * anything that moves once the drawing exists lives in the piece's `act`.
 */

export interface Point {
  x: number;
  y: number;
}

/**
 * Maps a piece's own coordinates onto the stage (or the camera's world): `translate(x,y) scale(scale)`.
 * Path data stays exactly as exported from Inkscape; the engine still works in stage units.
 */
export interface Fit {
  x: number;
  y: number;
  scale: number;
}

export interface FabStroke {
  /** Stable name: what `scene.stroke(id)` and acts refer to. */
  id: string;
  /** Path data in the piece's own coordinates. */
  d: string;
  /** Closed shapes fade their fill in after the outline is drawn. */
  fill?: boolean;
  /** Fill colour override (default currentColor), e.g. "var(--background)". */
  fillColor?: string;
  /**
   * Other shapes of this stroke (e.g. a raised wing): `{ at: 100, d }`. `d` above is pose 0, what the
   * laser draws. Every pose needs the identical node structure (the importer checks). Acts blend
   * with `scene.pose(id, amount)`; nothing is drawn for them.
   */
  poses?: { at: number; d: string }[];
  /**
   * The laser draws only `[from, to]` (fractions of the length, default `[0, 1]`). The rest stays
   * undrawn until an act reshapes the stroke, which shows all of it.
   */
  draw?: [number, number];
  /** Draw from the end back to the start (a leg drawn from the foot up). Only the drawing is reversed. */
  reverse?: boolean;
  /**
   * Never drawn by the laser: exists from the start (so it keeps its stacking place) but stays
   * invisible until an act calls `scene.show(id)`.
   */
  hidden?: boolean;
  /** `false`: fill only (no outline, no glow), e.g. a gradient bloom. Use with `hidden`. */
  outline?: boolean;
  /** Line weight on top of `Piece.line` (e.g. 0.5 for a leaf's vein). */
  line?: number;
}

/** What a piece's `act` can touch. Everything it creates or changes is undone for it. */
export interface Scene {
  readonly signal: AbortSignal;
  /** The drawn element of a stroke. Only valid during the act. */
  stroke(id: string): SVGPathElement;
  /** Blend a stroke between its `poses`: 0 is the drawn shape, 100 the last pose. */
  pose(id: string, amount: number): void;
  /** Make `hidden` strokes visible, optionally fading in over `fadeMs`. */
  show(ids: string | string[], fadeMs?: number): void;
  /** Show only part of a stroke's outline again, as `FabStroke.draw` does (`pose`/`setPath` show all of it). */
  limit(id: string, range: [number, number]): void;
  /** `show`'s opposite, optionally fading out first. Resolves when done. */
  hide(ids: string | string[], fadeMs?: number): Promise<void>;
  /** Replace a stroke's shape (outline and fill), e.g. a leg that bends. */
  setPath(id: string, d: string): void;
  /**
   * Hide the parts of these strokes that lie inside another stroke's shape, as if behind it (a tucked
   * leg behind the body); fades in over `fadeMs`. A mask is costly to paint every frame: once the
   * strokes are fully inside, `hide()` them for good (as `prepareTuck` does).
   */
  hideBehind(ids: string[], behindId: string, fadeMs?: number): void;
  /** Start something that keeps running (wings that flap) until the piece is torn down. Aborts are swallowed. */
  spawn(task: () => Promise<void>): void;
  /** Call `onFrame` with 0..1 over `ms` (linear unless `ease` is given). */
  tween(ms: number, onFrame: (t: number) => void, ease?: (x: number) => number): Promise<void>;
  wait(ms: number): Promise<void>;
  /** Run a Web Animation and resolve when it finishes. */
  animate(target: Element, keyframes: Keyframe[], options: KeyframeAnimationOptions): Promise<void>;
}

export interface Piece {
  id: string;
  fit: Fit;
  /** Array order is the STACKING order (later = in front) and, without `drawOrder`, the drawing order. */
  strokes: FabStroke[];
  /** Ids in the order the laser draws them, when that differs from stacking. Lists every non-`hidden` stroke once. */
  drawOrder?: string[];
  /** Keep the laser head above the strokes (needed when opaque fills would cover it). */
  headOnTop?: boolean;
  /** Outline glow: 0 = crisp lines, 1 = the original look (default). One number per piece. */
  glow?: number;
  /** Line weight relative to CONFIG.strokeWidth (default 1), for small pieces a full-weight line would swallow. */
  line?: number;
  /** `"original"`: drawn at the first version's (quicker) pace; default: CONFIG's. */
  pace?: "original";
  /** CSS colour of the strokes and fills (default: the stage's `color`). */
  color?: string;
  /**
   * A box (piece space) the strokes may grow into later (an open flower). The glow filter region
   * covers it. A stroke an act reshapes beyond its own poses must lie inside it, or its glow clips.
   */
  extent?: { x: number; y: number; width: number; height: number };
}
