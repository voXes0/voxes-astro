import { STAGE_SIZE } from "./config";

/**
 * The stage has no fixed aspect ratio: the viewBox is resized to the component (0 0 W H, in stage
 * units) so the longer side shows more world. The scale is the old one: the 300x300 "home" square
 * fits FILL of the shorter side, capped at MAX_SQUARE_PX. The camera centres on the viewBox middle.
 */
const FILL = 0.96;
const MAX_SQUARE_PX = 1024;
/** Edge fade of the stage, in stage units (a CSS mask: see `.stage` in Fabricator.module.css). */
const FADE = 8;

/** Fired on the stage after the viewBox changes. */
export const VIEWPORT_EVENT = "fab:viewport";

export function stageSize(stage: SVGSVGElement) {
  const box = stage.viewBox.baseVal;
  return { width: box.width || STAGE_SIZE, height: box.height || STAGE_SIZE };
}

/** Keeps the viewBox and the edge fade fitted to the component until `signal` aborts. */
export function fitViewport(stage: SVGSVGElement, signal: AbortSignal) {
  const host = stage.parentElement;
  if (!host) return;
  function fit() {
    const w = host!.clientWidth;
    const h = host!.clientHeight;
    if (w < 1 || h < 1) return;
    const px = Math.min(Math.min(w, h) * FILL, MAX_SQUARE_PX) / STAGE_SIZE; // screen px per stage unit
    const W = w / px;
    const H = h / px;
    const now = stage.viewBox.baseVal;
    if (Math.abs(now.width - W) < 0.01 && Math.abs(now.height - H) < 0.01) return;

    stage.setAttribute("viewBox", `0 0 ${W} ${H}`);
    stage.style.setProperty("--fab-fade", `${FADE * px}px`);
    stage.dispatchEvent(new Event(VIEWPORT_EVENT));
  }

  fit();
  const observer = new ResizeObserver(fit);
  observer.observe(host);
  signal.addEventListener("abort", () => observer.disconnect(), { once: true });
}
