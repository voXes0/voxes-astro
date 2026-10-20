import { CONFIG } from "./config";
import type { Head } from "./head";
import { animateValue } from "./timing";
import type { FabStroke, Piece, Point } from "./types";

const NS = "http://www.w3.org/2000/svg";
let layerSeq = 0;

/**
 * Where a layer lives when a camera is in play (see camera.ts). Without it the
 * piece's `fit` maps straight onto the stage, as it always did; with it `fit`
 * places the piece in the *world* and the camera maps the world onto the stage.
 */
export interface LayerView {
  /** The group the piece goes into (the camera's world). */
  host: SVGGElement;
  /** Stage units per world unit. Constant while the layer exists (it sets the line width). */
  zoom: number;
  /** World -> stage, for where the camera is right now (the laser head lives in stage space). */
  project: (p: Point) => Point;
  /**
   * Called whenever the zoom changes, so strokes can keep the same weight on screen (and the
   * glow the same size) however far the camera has pushed in. Returns the unsubscribe.
   */
  onZoom?: (listener: () => void) => () => void;
}

/**
 * Draw / fill mechanics for ONE piece. Knows nothing about which piece it is
 * or what happens after it is drawn — that is the sequencer's job.
 *
 * Coordinates: paths live in the piece's own space; everything the engine
 * measures or moves (head position, travel distance, durations) is converted to
 * stage units first, so CONFIG means the same for every piece.
 *
 * Every layer owns its glow filter (pieces can be on stage together, each with
 * its own scale and glow), created with the layer and removed with it.
 *
 * DOM per stroke:  <g> [ fill <path> (filled strokes only, crisp) ] outline <path> </g>
 * The glow filter sits on the outline only: filtering a filled shape blurs and
 * doubles its fill, which made big shapes look soft. Acts animate the <g>, so
 * fill and outline always move together.
 */
export function createLayer(
  stage: SVGSVGElement,
  piece: Piece,
  head: Head,
  signal: AbortSignal,
  view?: LayerView,
) {
  const container = view?.host ?? stage.querySelector<SVGGElement>("#fab-layer");
  const defs = stage.querySelector("defs");
  if (!container || !defs) throw new Error("fab: stage markup missing");

  const { x, y, scale: fitScale } = piece.fit;
  /** Piece units -> stage units: the fit, times the camera's zoom when there is one (which can change). */
  const scaleNow = () => fitScale * (view?.zoom ?? 1);
  let regionBox: [number, number, number, number] | null = null;
  const lineWidth = (stroke: FabStroke) =>
    (CONFIG.strokeWidth * (piece.line ?? 1) * (stroke.line ?? 1)) / scaleNow();
  /** Outer group: transitions animate this one (it has no transform of its own). */
  const wrapper = document.createElementNS(NS, "g");
  /** Inner group: carries the piece-to-stage fit. */
  const group = document.createElementNS(NS, "g");
  group.setAttribute("transform", `translate(${x},${y}) scale(${fitScale})`);
  wrapper.appendChild(group);
  if (piece.color) wrapper.style.color = piece.color;
  container.appendChild(wrapper);
  const glow = piece.glow ?? 1;
  const glowFilter = document.createElementNS(NS, "filter");
  glowFilter.id = `fab-glow-${++layerSeq}`;
  const blur = document.createElementNS(NS, "feGaussianBlur");
  // Filter units follow the element's user space, so counter the scale.
  blur.setAttribute("stdDeviation", String((CONFIG.glowBlur * glow) / scaleNow()));
  blur.setAttribute("result", "blur");
  const merge = document.createElementNS(NS, "feMerge");
  for (const input of ["blur", "SourceGraphic"]) {
    const node = document.createElementNS(NS, "feMergeNode");
    node.setAttribute("in", input);
    merge.appendChild(node);
  }
  glowFilter.append(blur, merge);
  if (glow > 0) {
    defs.appendChild(glowFilter);
    fitFilterRegion();
  }

  /**
   * The default filter region is a multiple of each shape's own bounding box,
   * which is thinner than the stroke itself for a straight vertical or
   * horizontal line: its glow (and part of the line) got clipped, so thin
   * strokes looked crisp while big shapes looked soft. Use one fixed region
   * around the whole piece instead, so every stroke is treated alike.
   */
  function applyFilterRegion() {
    if (!regionBox) return;
    const [x0, y0, x1, y1] = regionBox;
    const pad = 12 / scaleNow(); // 12 stage units of room for the glow and for acts
    glowFilter.setAttribute("filterUnits", "userSpaceOnUse");
    glowFilter.setAttribute("x", String(x0 - pad));
    glowFilter.setAttribute("y", String(y0 - pad));
    glowFilter.setAttribute("width", String(x1 - x0 + 2 * pad));
    glowFilter.setAttribute("height", String(y1 - y0 + 2 * pad));
  }
  function fitFilterRegion() {
    const probe = document.createElementNS(NS, "path");
    group.appendChild(probe);
    let [x0, y0, x1, y1] = [Infinity, Infinity, -Infinity, -Infinity];
    for (const s of piece.strokes) {
      for (const d of [s.d, ...(s.poses ?? []).map((p) => p.d)]) {
        probe.setAttribute("d", d);
        const b = probe.getBBox();
        x0 = Math.min(x0, b.x);
        y0 = Math.min(y0, b.y);
        x1 = Math.max(x1, b.x + b.width);
        y1 = Math.max(y1, b.y + b.height);
      }
    }
    probe.remove();
    const e = piece.extent; // where strokes may grow to later (an open flower)
    if (e) {
      x0 = Math.min(x0, e.x);
      y0 = Math.min(y0, e.y);
      x1 = Math.max(x1, e.x + e.width);
      y1 = Math.max(y1, e.y + e.height);
    }
    regionBox = [x0, y0, x1, y1];
    applyFilterRegion();
  }

  const fills = new WeakMap<SVGPathElement, SVGPathElement>();
  const wrappers = new WeakMap<SVGPathElement, SVGGElement>();

  /** Every stroke of this layer, to re-weigh when the camera zooms. */
  const made: { el: SVGPathElement; stroke: FabStroke }[] = [];
  let weighedAt = scaleNow();
  const unzoom = view?.onZoom?.(() => {
    const now = scaleNow();
    if (Math.abs(now / weighedAt - 1) < 0.002) return; // not worth touching the DOM
    weighedAt = now;
    for (const { el, stroke } of made) el.setAttribute("stroke-width", String(lineWidth(stroke)));
    blur.setAttribute("stdDeviation", String((CONFIG.glowBlur * glow) / now));
    applyFilterRegion();
  });

  const toStage = (p: Point): Point => {
    const w = { x: x + p.x * fitScale, y: y + p.y * fitScale };
    return view ? view.project(w) : w;
  };
  const pace = piece.pace === "original" ? CONFIG.originalPace : CONFIG;
  const drawMs = (len: number) =>
    Math.min(
      pace.maxDrawMs,
      Math.max(pace.minDrawMs, ((len * scaleNow()) / 100) * pace.drawMsPer100),
    );

  /** Straight-line hop of the head, unlike drawing: quick repositioning. */
  async function travel(from: Point | null, to: Point) {
    if (from) {
      const dist = Math.hypot(to.x - from.x, to.y - from.y);
      if (dist > 0.5) {
        const ms = Math.min(
          pace.maxTravelMs,
          Math.max(pace.minTravelMs, (dist / 100) * pace.travelMsPer100),
        );
        await animateValue(
          0,
          1,
          ms,
          (v) =>
            head.setPos(from.x + (to.x - from.x) * v, from.y + (to.y - from.y) * v),
          signal,
        );
      }
    }
    head.setPos(to.x, to.y);
  }

  /** Returns the outline path (what draw() and acts address by stroke id). */
  function createStroke(stroke: FabStroke): SVGPathElement {
    const g = document.createElementNS(NS, "g");

    let fill: SVGPathElement | undefined;
    if (stroke.fill) {
      fill = document.createElementNS(NS, "path");
      fill.setAttribute("d", stroke.d);
      fill.setAttribute("data-fab-fill", stroke.id);
      fill.setAttribute("fill", stroke.fillColor ?? "currentColor");
      fill.setAttribute("fill-opacity", "0");
      fill.setAttribute("stroke", "none");
      g.appendChild(fill); // under its own outline
    }

    const el = document.createElementNS(NS, "path");
    el.setAttribute("d", stroke.d);
    el.setAttribute("data-fab-stroke", stroke.id);
    el.setAttribute("fill", "none");
    el.setAttribute("stroke", "currentColor");
    el.setAttribute("stroke-width", String(lineWidth(stroke)));
    el.setAttribute("stroke-linecap", "round");
    el.setAttribute("stroke-linejoin", "round");
    if (stroke.outline === false) el.setAttribute("stroke", "none");
    else if (glow > 0) el.setAttribute("filter", `url(#${glowFilter.id})`);
    g.appendChild(el);

    group.appendChild(g);
    made.push({ el, stroke });
    wrappers.set(el, g);
    if (fill) fills.set(el, fill);
    return el;
  }

  /**
   * Show `revealed` length of a path starting at distance s0: one dash of that
   * length, then a gap longer than the whole path, with the pattern shifted to
   * begin at s0. (Nothing before s0, nothing after the dash.) A zero-length dash
   * would still leave a round dot, so the cap is butt until something shows.
   */
  function dash(el: SVGPathElement, len: number, s0: number, span: number, revealed: number) {
    revealed = Math.max(0, revealed); // a negative dash is invalid: the browser would draw the whole line
    el.setAttribute("stroke-dasharray", `${revealed} ${len + span + 1}`);
    el.setAttribute("stroke-dashoffset", String(-s0));
    el.setAttribute("stroke-linecap", revealed > 0 ? "round" : "butt");
  }

  async function draw(
    el: SVGPathElement,
    from: Point | null,
    range: [number, number] = [0, 1],
    reverse = false,
  ): Promise<Point> {
    const len = el.getTotalLength();
    const whole = range[0] <= 0 && range[1] >= 1;
    const s0 = len * Math.max(0, range[0]);
    const span = len * Math.min(1, range[1]) - s0;
    // `reverse`: the laser starts at the end of the line and works back to its start
    const first = reverse ? s0 + span : s0;
    const last = reverse ? s0 : s0 + span;
    const at = (r: number) => (reverse ? s0 + span - r : s0 + r); // the laser's place after r of the line
    const show = (r: number) => dash(el, len, reverse ? s0 + span - r : s0, span, r);
    show(0);
    head.show();
    await travel(from, toStage(el.getPointAtLength(first)));
    await animateValue(
      0,
      span,
      drawMs(span),
      (r) => {
        show(r);
        const p = toStage(el.getPointAtLength(at(r)));
        head.setPos(p.x, p.y);
      },
      signal,
    );
    // The dash only exists to reveal the line; a finished stroke is a plain
    // stroke (a dashed one rasterizes slightly thinner and differently).
    // A part-drawn stroke keeps it until an act reshapes the stroke.
    if (whole) {
      el.removeAttribute("stroke-dasharray");
      el.removeAttribute("stroke-dashoffset");
    }
    el.setAttribute("stroke-linecap", "round");
    return toStage(el.getPointAtLength(last));
  }

  const fillTarget = (s: FabStroke) =>
    s.fillColor ? CONFIG.overrideFillOpacity : CONFIG.accentFillOpacity;

  async function fillIn(el: SVGPathElement, s: FabStroke) {
    const f = fills.get(el);
    if (!f) return;
    const target = fillTarget(s);
    await animateValue(
      0,
      1,
      CONFIG.fillInMs,
      (v) => f.setAttribute("fill-opacity", String(v * target)),
      signal,
    );
  }

  /**
   * Finished, with no motion: prefers-reduced-motion, and strokes the laser
   * never draws (`hidden`, which also stay invisible until shown).
   */
  function createStatic(stroke: FabStroke): SVGPathElement {
    const el = createStroke(stroke);
    fills.get(el)?.setAttribute("fill-opacity", String(fillTarget(stroke)));
    if (stroke.draw && (stroke.draw[0] > 0 || stroke.draw[1] < 1)) {
      const len = el.getTotalLength();
      const s0 = len * stroke.draw[0];
      dash(el, len, s0, len * stroke.draw[1] - s0, len * stroke.draw[1] - s0);
    }
    if (stroke.hidden) wrappers.get(el)!.style.display = "none";
    return el;
  }

  return {
    wrapper,
    group,
    toStage,
    createStroke,
    createStatic,
    draw,
    fillIn,
    /** The crisp fill path of a filled stroke, if it has one. */
    fillOf: (el: SVGPathElement) => fills.get(el),
    /** Hidden strokes are `display: none` until shown. */
    reveal: (el: SVGPathElement) => {
      const w = wrappers.get(el);
      if (w) w.style.display = "";
    },
    /** Show only [from, to] (fractions of the length) of a finished outline, as `FabStroke.draw`. */
    limit: (el: SVGPathElement, range: [number, number]) => {
      const len = el.getTotalLength();
      const s0 = len * range[0];
      const span = len * range[1] - s0;
      dash(el, len, s0, span, span);
    },
    conceal: (el: SVGPathElement) => {
      const w = wrappers.get(el);
      if (w) w.style.display = "none";
    },
    /** The <g> holding a stroke's fill and outline — what acts animate. */
    wrapperOf: (el: SVGPathElement) => wrappers.get(el),
    destroy: () => {
      unzoom?.();
      wrapper.remove();
      glowFilter.remove();
    },
  };
}

export type Layer = ReturnType<typeof createLayer>;
