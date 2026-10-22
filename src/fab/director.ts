import { buildPiece } from "./build";
import { createCamera, type Camera } from "./camera";
import { createLayer, type Layer } from "./engine";
import { createHead, type Head } from "./head";
import { createScene } from "./scene";
import { abortError, isAbort, wait } from "./timing";
import type { Piece, Point, Scene } from "./types";

/**
 * Chapters: several pieces share one *world*, a camera frames part of it, and the chapter's `run` is
 * a script (add a piece, let the laser build it or place it finished, move the camera, add the next).
 */

/** A piece that is in the world. */
export interface Actor {
  readonly piece: Piece;
  /** The toolbox for this piece (strokes by id, pose, show/hide, tween...). */
  readonly scene: Scene;
  readonly layer: Layer;
  /** The laser builds it. Resolves with where the head ended (stage units). */
  build(from: Point | null): Promise<Point | null>;
  /** It is simply there, finished (the ground that was "predrawn"). */
  place(): void;
  /** Take it out of the world; everything its scene started stops. */
  remove(): void;
}

export interface Director {
  readonly stage: SVGSVGElement;
  readonly signal: AbortSignal;
  readonly head: Head;
  readonly camera: Camera;
  add(piece: Piece): Actor;
  /** Publish progress on the stage (`data-fab-state`), for tests and CSS. */
  state(s: string): void;
  /** Name the current beat of the film (`data-fab-beat`), for tests and CSS. */
  beat(name: string): void;
  wait(ms: number): Promise<void>;
}

export interface Chapter {
  id: string;
  /** How many world units fit across the stage. */
  view: number;
  /** The film. Resolve when the last thing has happened; the finish is then held. */
  run(d: Director): Promise<void>;
  /** prefers-reduced-motion: the finished scene, without motion. */
  still?(d: Director): void;
  /** Play again from the start this long after the end (default: hold the finish for good). */
  repeatAfterMs?: number;
}

export function mountChapters(stage: SVGSVGElement, chapters: Chapter[]): () => void {
  const ac = new AbortController();
  const { signal } = ac;
  const head = createHead(stage, signal);
  const camera = createCamera(stage, signal);
  const state = (s: string, id?: string) => {
    stage.dataset.fabState = s;
    if (id) stage.dataset.fabPiece = id;
  };

  function director(actors: Actor[]): Director {
    return {
      stage,
      signal,
      head,
      camera,
      state: (s) => state(s),
      beat: (name) => {
        stage.dataset.fabBeat = name;
      },
      wait: (ms) => wait(ms, signal),
      add(piece) {
        const layer = createLayer(stage, piece, head, signal, camera.view);
        const els = new Map<string, SVGPathElement>();
        const scene = createScene(piece, els, layer, signal);
        const actor: Actor = {
          piece,
          scene,
          layer,
          async build(from) {
            if (piece.headOnTop) head.raise(true);
            try {
              return await buildPiece(layer, piece, els, head, from);
            } finally {
              if (piece.headOnTop) head.raise(false);
            }
          },
          place() {
            for (const stroke of piece.strokes) els.set(stroke.id, layer.createStatic(stroke));
          },
          remove() {
            scene.dispose();
            layer.destroy();
            const i = actors.indexOf(actor);
            if (i >= 0) actors.splice(i, 1);
          },
        };
        actors.push(actor);
        return actor;
      },
    };
  }

  async function play(chapter: Chapter) {
    const actors: Actor[] = [];
    camera.setView(chapter.view);
    const d = director(actors);
    state("building", chapter.id);
    try {
      await chapter.run(d);
      state("static", chapter.id);
      if (chapter.repeatAfterMs === undefined) await new Promise<void>((_, reject) => {
        if (signal.aborted) reject(abortError());
        signal.addEventListener("abort", () => reject(abortError()), { once: true });
      });
      await wait(chapter.repeatAfterMs ?? 0, signal);
      // fade the world out before the next round
      const fade = camera.host.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 600, fill: "forwards" });
      await fade.finished.catch(() => {});
      for (const a of [...actors]) a.remove();
      fade.cancel();
    } finally {
      for (const a of [...actors]) a.remove();
    }
  }

  async function run() {
    if (chapters.length === 0) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const chapter = chapters[0];
      camera.setView(chapter.view);
      chapter.still?.(director([]));
      state("static", chapter.id);
      return;
    }
    for (let i = 0; ; i = (i + 1) % chapters.length) await play(chapters[i]);
  }

  run().catch((e) => {
    if (!isAbort(e)) console.error(e);
  });

  return () => ac.abort();
}
