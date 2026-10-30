import { CONFIG } from "./config";
import type { Head } from "./head";
import { animateValue } from "./timing";
import type { FabStroke, Piece, Point } from "./types";
import { SVG_NS as NS } from "./config";

type Box = [number, number, number, number]; // x0, y0, x1, y1

let layerSeq = 0;
/** Filter region per piece (its geometry is fixed): re-creating a layer each round needs no measuring. */
const regionBoxes = new WeakMap<Piece, Box>();
/** Each stroke's own box (its shape and all its poses), measured together with the piece's. */
const strokeBoxes = new WeakMap<Piece, Map<string, Box>>();

/** Where a layer lives under a camera (camera.ts): `fit` places the piece in the *world*, not on the stage. */
export interface LayerView {
  /** The group the piece goes into (the camera's world). */
  host: SVGGElement;
  /** Stage units per world unit, read when the layer is created. */
  zoom: number;
  /** World -> stage, for where the camera is right now (the laser head lives in stage space). */
  project: (p: Point) => Point;
  /** Called when the zoom changes, so line weight and glow stay the same on screen. Returns the unsubscribe. */
  onZoom?: (listener: () => void) => () => void;
}

/**
 * Draw / fill mechanics for ONE piece; what happens after it is drawn is the director's job.
 *
 * Paths live in the piece's own space, but everything the engine measures or moves (head position,
 * travel distance, durations) is converted to stage units first, so CONFIG means the same everywhere.
 * Each layer owns its glow filter.
 *
 * DOM per stroke:  <g> [ fill <path> (filled strokes only) ] outline <path> </g>
 * The glow sits on the outline only (filtering a filled shape blurs and doubles its fill).
 * Acts animate the <g>, so fill and outline move together.
 */
export function createLayer(
  stage: SVGSVGElement,
  piece: Piece,
  head: Head,
  signal: AbortSignal,
  view?: LayerView,
) {
  const container = view?.host ?? stage.querySelector<SVGGElement>("#fab-layer");
  const defsEl = stage.querySelector("defs");
  if (!container || !defsEl) throw new Error("fab: stage markup missing");
  const defs: SVGDefsElement = defsEl;

  const { x, y, scale: fitScale } = piece.fit;
  /** Piece units -> stage units: the fit, times the camera's zoom when there is one (which can change). */
  const scaleNow = () => fitScale * (view?.zoom ?? 1);
  const glow = piece.glow ?? 1;
  const lineWidth = (stroke: FabStroke) =>
    (CONFIG.strokeWidth * (piece.line ?? 1) * (stroke.line ?? 1)) / scaleNow();
  /** Filter units follow the element's user space, so the blur counters the scale. */
  const blurDeviation = (scale: number) => String((CONFIG.glowBlur * glow) / scale);
  let regionBox: Box | null = null;
  /** Outer group: transitions and acts animate this one (it has no transform of its own). */
  const wrapper = document.createElementNS(NS, "g");
  /** Inner group: carries the piece-to-stage fit. */
  const group = document.createElementNS(NS, "g");
  group.setAttribute("transform", `translate(${x},${y}) scale(${fitScale})`);
  wrapper.appendChild(group);
  if (piece.color) wrapper.style.color = piece.color;
  container.appendChild(wrapper);
  const glowFilter = document.createElementNS(NS, "filter");
  glowFilter.id = `fab-glow-${++layerSeq}`;
  const blur = document.createElementNS(NS, "feGaussianBlur");
  blur.setAttribute("stdDeviation", blurDeviation(scaleNow()));
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
   * Glow regions. Every stroke gets a filter whose region hugs its own box (all its poses included),
   * so each blur touches only its own pixels. The default region (a multiple of the box) clips a
   * straight horizontal or vertical line's glow, hence the explicit one. A stroke an act reshapes
   * with `setPath` can go anywhere, so it switches to the piece-wide region (`widen`).
   */
  function applyFilterRegion() {
    if (!regionBox) return;
    const [x0, y0, x1, y1] = regionBox;
    const pad = 12 / scaleNow(); // 12 stage units: room for the glow and for acts
    glowFilter.setAttribute("filterUnits", "userSpaceOnUse");
    glowFilter.setAttribute("x", String(x0 - pad));
    glowFilter.setAttribute("y", String(y0 - pad));
    glowFilter.setAttribute("width", String(x1 - x0 + 2 * pad));
    glowFilter.setAttribute("height", String(y1 - y0 + 2 * pad));
  }
  function fitFilterRegion() {
    let box = regionBoxes.get(piece);
    if (!box) {
      // Probe every outline in one batch: only the first getBBox forces a layout.
      const probes = document.createElementNS(NS, "g");
      group.appendChild(probes);
      const probed: { id: string; el: SVGPathElement }[] = [];
      for (const s of piece.strokes) {
        for (const d of [s.d, ...(s.poses ?? []).map((p) => p.d)]) {
          const el = document.createElementNS(NS, "path");
          el.setAttribute("d", d);
          probes.appendChild(el);
          probed.push({ id: s.id, el });
        }
      }
      const grow = (to: Box, x: number, y: number, w: number, h: number) => {
        to[0] = Math.min(to[0], x);
        to[1] = Math.min(to[1], y);
        to[2] = Math.max(to[2], x + w);
        to[3] = Math.max(to[3], y + h);
      };
      const whole: Box = [Infinity, Infinity, -Infinity, -Infinity];
      const each = new Map<string, Box>();
      for (const { id, el } of probed) {
        const b = el.getBBox();
        grow(whole, b.x, b.y, b.width, b.height);
        if (!each.has(id)) each.set(id, [Infinity, Infinity, -Infinity, -Infinity]);
        grow(each.get(id)!, b.x, b.y, b.width, b.height);
      }
      probes.remove();
      const e = piece.extent; // where strokes grow to later
      if (e) grow(whole, e.x, e.y, e.width, e.height);
      regionBoxes.set(piece, whole);
      strokeBoxes.set(piece, each);
      box = whole;
    }
    regionBox = box;
    applyFilterRegion();
  }

  const fills = new WeakMap<SVGPathElement, SVGPathElement>();
  const wrappers = new WeakMap<SVGPathElement, SVGGElement>();

  /** A stroke's own glow filter, hugging its box (see the note above `applyFilterRegion`). */
  interface Glow {
    node: SVGFilterElement;
    blur: SVGFEGaussianBlurElement;
    box: Box;
    stroke: FabStroke;
  }
  function tightGlow(stroke: FabStroke): Glow | undefined {
    const box = strokeBoxes.get(piece)?.get(stroke.id);
    if (!box || box[0] > box[2]) return;
    const node = glowFilter.cloneNode(true) as SVGFilterElement;
    node.id = `${glowFilter.id}-${stroke.id}`;
    node.removeAttribute("x");
    node.removeAttribute("y");
    node.removeAttribute("width");
    node.removeAttribute("height");
    const glowNow: Glow = { node, blur: node.querySelector("feGaussianBlur")!, box, stroke };
    defs.appendChild(node);
    placeGlow(glowNow);
    return glowNow;
  }
  /** Blur and region for the current zoom: the region covers the box plus the glow and the line. */
  function placeGlow({ node, blur: b, box, stroke }: Glow) {
    const sigma = (CONFIG.glowBlur * glow) / scaleNow();
    const pad = 4 * sigma + lineWidth(stroke);
    b.setAttribute("stdDeviation", String(sigma));
    node.setAttribute("filterUnits", "userSpaceOnUse");
    node.setAttribute("x", String(box[0] - pad));
    node.setAttribute("y", String(box[1] - pad));
    node.setAttribute("width", String(box[2] - box[0] + 2 * pad));
    node.setAttribute("height", String(box[3] - box[1] + 2 * pad));
  }

  /** Every stroke, to re-weigh when the camera zooms. */
  const made: { el: SVGPathElement; stroke: FabStroke; glow?: Glow }[] = [];
  const madeOf = new WeakMap<SVGPathElement, (typeof made)[number]>();
  let weighedAt = scaleNow();
  const unzoom = view?.onZoom?.(() => {
    if (wrapper.style.display === "none") return; // culled: catches up on the first zoom after it shows again
    const now = scaleNow();
    if (Math.abs(now / weighedAt - 1) < CONFIG.zoomTolerance) return;
    weighedAt = now;
    for (const m of made) {
      m.el.setAttribute("stroke-width", String(lineWidth(m.stroke)));
      if (m.glow) placeGlow(m.glow);
    }
    blur.setAttribute("stdDeviation", blurDeviation(now));
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

  /** A quick straight hop of the head (drawing is slower). */
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
      g.appendChild(fill);
    }

    const el = document.createElementNS(NS, "path");
    el.setAttribute("d", stroke.d);
    el.setAttribute("data-fab-stroke", stroke.id);
    el.setAttribute("fill", "none");
    el.setAttribute("stroke", "currentColor");
    el.setAttribute("stroke-width", String(lineWidth(stroke)));
    el.setAttribute("stroke-linecap", "round");
    el.setAttribute("stroke-linejoin", "round");
    const entry: (typeof made)[number] = { el, stroke };
    if (stroke.outline === false) el.setAttribute("stroke", "none");
    else if (glow > 0) {
      entry.glow = tightGlow(stroke);
      el.setAttribute("filter", `url(#${entry.glow?.node.id ?? glowFilter.id})`);
    }
    g.appendChild(el);

    group.appendChild(g);
    made.push(entry);
    madeOf.set(el, entry);
    wrappers.set(el, g);
    if (fill) fills.set(el, fill);
    return el;
  }

  /**
   * Show `revealed` length of a path from distance s0: one dash, then a gap longer than the path.
   * The cap stays butt until something shows (a zero-length round dash would leave a dot).
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
    // `reverse`: the laser starts at the end of the line and works back
    const at = (r: number) => (reverse ? s0 + span - r : s0 + r); // the laser's distance along the line after r drawn
    const first = at(0);
    const last = at(span);
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
    // A finished stroke drops the dash (a dashed one rasterizes slightly thinner); a part-drawn one keeps it.
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

  /** Show only [from, to] (fractions of the length) of a finished outline. */
  function limit(el: SVGPathElement, range: [number, number]) {
    const len = el.getTotalLength();
    const s0 = len * range[0];
    const span = len * range[1] - s0;
    dash(el, len, s0, span, span);
  }

  /** Finished, no motion: for prefers-reduced-motion, and for `hidden` strokes (invisible until shown). */
  function createStatic(stroke: FabStroke): SVGPathElement {
    const el = createStroke(stroke);
    fills.get(el)?.setAttribute("fill-opacity", String(fillTarget(stroke)));
    if (stroke.draw && (stroke.draw[0] > 0 || stroke.draw[1] < 1)) limit(el, stroke.draw);
    if (stroke.hidden) conceal(el);
    return el;
  }
  const reveal = (el: SVGPathElement) => {
    const w = wrappers.get(el);
    if (w) w.style.display = "";
  };
  function conceal(el: SVGPathElement) {
    const w = wrappers.get(el);
    if (w) w.style.display = "none";
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
    /** Hidden strokes are `display: none` until revealed. */
    reveal,
    limit,
    conceal,
    /** The stroke is about to be reshaped freely: give it the piece-wide glow region, which covers wherever it goes. */
    widen: (el: SVGPathElement) => {
      const m = madeOf.get(el);
      if (!m?.glow) return;
      if (el.hasAttribute("filter")) el.setAttribute("filter", `url(#${glowFilter.id})`);
      m.glow.node.remove();
      m.glow = undefined;
    },
    /** The <g> holding a stroke's fill and outline: what acts animate. */
    wrapperOf: (el: SVGPathElement) => wrappers.get(el),
    destroy: () => {
      unzoom?.();
      wrapper.remove();
      glowFilter.remove();
      for (const m of made) m.glow?.node.remove();
    },
  };
}

export type Layer = ReturnType<typeof createLayer>;
