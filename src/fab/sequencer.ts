import { buildPiece } from "./build";
import { CONFIG } from "./config";
import { createLayer } from "./engine";
import { createHead } from "./head";
import { createScene } from "./scene";
import { isAbort, wait } from "./timing";
import { runTransition } from "./transitions";
import type { Piece, Point } from "./types";

/**
 * Plays pieces forever, one after another:
 *   build (laser draws, fills fade in) -> act (or hold) -> extra hold
 *   -> transition out -> next piece (the laser head carries over).
 * Returns destroy(), which stops everything.
 *
 * The stage advertises where it is via data attributes so tests (and CSS) can
 * wait on real state instead of guessing timings:
 *   data-fab-piece="tv"   data-fab-state="building|acting|transitioning|static"
 */
export function mountFabricator(
  stage: SVGSVGElement,
  pieces: Piece[],
): () => void {
  const ac = new AbortController();
  const { signal } = ac;
  const head = createHead(stage, signal);
  const state = (s: string, piece?: Piece) => {
    stage.dataset.fabState = s;
    if (piece) stage.dataset.fabPiece = piece.id;
  };

  /** Plays one piece; resolves with where the transition left the laser head. */
  async function play(piece: Piece, from: Point | null): Promise<Point | null> {
    const layer = createLayer(stage, piece, head, signal);
    const els = new Map<string, SVGPathElement>();
    const scene = createScene(stage, piece, els, layer, signal);
    if (piece.headOnTop) head.raise(true);
    try {
      state("building", piece);
      await buildPiece(layer, piece, els, head, from);

      state("acting", piece);
      if (piece.act) await piece.act(scene);
      else await wait(piece.holdMs ?? CONFIG.defaultHoldMs, signal);
      await wait(CONFIG.actExtraMs, signal);

      state("transitioning", piece);
      return await runTransition(piece.transition ?? CONFIG.transition, layer, head, stage, signal);
    } finally {
      scene.dispose();
      layer.destroy();
      if (piece.headOnTop) head.raise(false);
    }
  }

  function showStatic(piece: Piece) {
    const layer = createLayer(stage, piece, head, signal);
    for (const stroke of piece.strokes) layer.createStatic(stroke);
    state("static", piece);
  }

  async function run() {
    if (pieces.length === 0) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      showStatic(pieces[0]);
      return;
    }
    let handoff: Point | null = null;
    for (let i = 0; ; i = (i + 1) % pieces.length) {
      handoff = await play(pieces[i], handoff);
    }
  }

  run().catch((e) => {
    if (!isAbort(e)) console.error(e);
  });

  return () => ac.abort();
}
