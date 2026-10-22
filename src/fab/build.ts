import type { Layer } from "./engine";
import type { Head } from "./head";
import type { FabStroke, Piece, Point } from "./types";

/**
 * The laser's build loop for ONE piece: creates its strokes in stacking order and
 * draws them in drawing order, fading fills in after each outline. It is the one
 * place that knows `drawOrder`, `FabStroke.draw` and `FabStroke.hidden` (used by director.ts).
 * (`Piece.headOnTop` is the caller's to apply: it spans more than the build.)
 *
 * `els` is filled with every stroke's outline element by id (what `scene.stroke` reads).
 * Returns where the laser head ended (stage units), to hand over to the next piece.
 */
export async function buildPiece(
  layer: Layer,
  piece: Piece,
  els: Map<string, SVGPathElement>,
  head: Head,
  from: Point | null,
): Promise<Point | null> {
  let at = from;
  const drawOne = async (stroke: FabStroke, el: SVGPathElement) => {
    at = await layer.draw(el, at, stroke.draw, stroke.reverse);
    if (stroke.fill) await layer.fillIn(el, stroke);
  };
  if (piece.drawOrder) {
    // Stacking order and drawing order differ: every stroke is created now, in
    // stacking order, and the ones still waiting to be drawn stay invisible.
    const byId = new Map(piece.strokes.map((s) => [s.id, s]));
    const todo = piece.strokes.filter((s) => !s.hidden).map((s) => s.id).sort();
    if (JSON.stringify([...piece.drawOrder].sort()) !== JSON.stringify(todo)) {
      throw new Error(`fab: drawOrder of "${piece.id}" must list every non-hidden stroke exactly once`);
    }
    for (const stroke of piece.strokes) {
      if (stroke.hidden) {
        els.set(stroke.id, layer.createStatic(stroke));
      } else {
        const el = layer.createStroke(stroke);
        layer.conceal(el);
        els.set(stroke.id, el);
      }
    }
    for (const id of piece.drawOrder) {
      const el = els.get(id)!;
      layer.reveal(el);
      await drawOne(byId.get(id)!, el);
    }
  } else {
    for (const stroke of piece.strokes) {
      if (stroke.hidden) {
        els.set(stroke.id, layer.createStatic(stroke));
        continue; // never drawn; the scene shows it later
      }
      const el = layer.createStroke(stroke);
      els.set(stroke.id, el);
      await drawOne(stroke, el);
    }
  }
  head.hide();
  return at;
}
