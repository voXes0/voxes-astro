import { CONFIG, STAGE_SIZE } from "./config";
import type { Layer } from "./engine";
import type { Head } from "./head";
import { playAnimation, wait } from "./timing";
import type { Point, TransitionName } from "./types";

export type { TransitionName };

/**
 * How a finished piece leaves the stage. Each transition animates the layer's
 * wrapper group and returns where it left the laser head (or null), so the next
 * piece's first stroke can start from there instead of from nowhere.
 *
 * Adding one = add a function here and a name above. Nothing else changes.
 */
export async function runTransition(
  name: TransitionName,
  layer: Layer,
  head: Head,
  stage: SVGSVGElement,
  signal: AbortSignal,
): Promise<Point | null> {
  head.hide();
  if (name === "fade") return fade(layer, signal);
  if (name === "flyout") return flyOut(layer, stage, signal);
  return collapse(layer, head, signal);
}

/**
 * Centre of the piece in stage units, and its wrapper set up so CSS transforms
 * use stage coordinates (origin 0 0 of the viewBox), letting the animations
 * below rotate/scale about `c` with plain translate() pairs.
 */
function prepareForTransform(layer: Layer) {
  const box = layer.group.getBBox();
  const c = layer.toStage({ x: box.x + box.width / 2, y: box.y + box.height / 2 });
  const w = layer.wrapper;
  w.style.transformOrigin = "0 0";
  w.style.transformBox = "view-box";
  return { c, w };
}

/** Plain cross-fade out. */
async function fade(layer: Layer, signal: AbortSignal): Promise<Point | null> {
  await playAnimation(
    layer.wrapper,
    [{ opacity: 1 }, { opacity: 0 }],
    { duration: CONFIG.fadeMs, easing: "ease-in" },
    signal,
  );
  return null;
}

/**
 * CRT switch-off: the piece squashes to a horizontal line, the line shrinks to
 * a dot, and that dot IS the laser head — which then travels to the next
 * piece's first stroke.
 */
async function collapse(
  layer: Layer,
  head: Head,
  signal: AbortSignal,
): Promise<Point> {
  const { c, w } = prepareForTransform(layer);
  const about = (sx: number, sy: number) =>
    `translate(${c.x}px, ${c.y}px) scale(${sx}, ${sy}) translate(${-c.x}px, ${-c.y}px)`;

  const { collapseSquashMs: squash, collapseShrinkMs: shrink } = CONFIG;
  const anim = playAnimation(
    w,
    [
      { transform: about(1, 1), offset: 0, easing: "cubic-bezier(0.55, 0, 0.9, 0.45)" },
      { transform: about(1, 0.015), offset: squash / (squash + shrink), easing: "cubic-bezier(0.4, 0, 0.8, 0.6)" },
      { transform: about(0, 0.015), offset: 1 },
    ],
    { duration: squash + shrink },
    signal,
  );
  // Both promises are awaited together so that if the fabricator is stopped
  // mid-way, neither one is left rejecting with nobody listening.
  await Promise.all([
    anim,
    wait(squash, signal).then(() => {
      // the line has formed: the head takes over at the collapse point
      head.setPos(c.x, c.y);
      head.show();
    }),
  ]);
  return c;
}

/**
 * The piece accelerates away to the right (the way a bird faces), climbing a
 * little and pitching up, until it has left the component. Whatever the piece
 * keeps doing on its own (flapping wings) carries on meanwhile. The distance is
 * measured, so it works at any screen size.
 */
async function flyOut(
  layer: Layer,
  stage: SVGSVGElement,
  signal: AbortSignal,
): Promise<Point | null> {
  const host = stage.parentElement!.getBoundingClientRect(); // the component
  const here = layer.group.getBoundingClientRect(); // where the piece is now
  const unit = stage.getBoundingClientRect().width / STAGE_SIZE; // screen px per stage unit
  const dx = (host.right - here.left) / unit + 10; // its tail clears the edge
  const dy = -dx * 0.14;

  const { c, w } = prepareForTransform(layer);
  const pose = (x: number, y: number, deg: number) =>
    `translate(${x}px, ${y}px) translate(${c.x}px, ${c.y}px) rotate(${deg}deg) translate(${-c.x}px, ${-c.y}px)`;
  await playAnimation(
    w,
    [{ transform: pose(0, 0, 0) }, { transform: pose(dx, dy, -7) }],
    { duration: CONFIG.flyOutMs, easing: "cubic-bezier(0.5, 0, 0.85, 0.6)" },
    signal,
  );
  return null;
}
