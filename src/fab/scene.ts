import type { Layer } from "./engine";
import { createPoseBlender } from "./pose";
import { abortError, animateValue, isAbort, linear, wait } from "./timing";
import type { OverlaySpec, Piece, Scene } from "./types";

const NS = "http://www.w3.org/2000/svg";
let maskSeq = 0;

/**
 * The toolbox handed to a piece's `act`. It tracks everything an act creates or
 * changes (animations, overlays, reshaped strokes, clips) so `dispose()` can
 * undo it all when the piece is torn down — acts never have to clean up.
 */
export function createScene(
  stage: SVGSVGElement,
  piece: Piece,
  strokeEls: Map<string, SVGPathElement>,
  layer: Layer,
  appSignal: AbortSignal,
): Scene & { dispose(): void } {
  // The scene's own signal: aborted when the whole fabricator stops OR when this
  // piece is torn down, so background tasks (spawn) never outlive their piece.
  const ac = new AbortController();
  const signal = ac.signal;
  const stopWithApp = () => ac.abort();
  appSignal.addEventListener("abort", stopWithApp, { once: true });

  const overlayHost = stage.querySelector<SVGGElement>("#fab-overlay");
  if (!overlayHost) throw new Error("fab: overlay markup missing");

  const animations: Animation[] = [];
  const overlays: SVGElement[] = [];
  const masks: { mask: SVGElement; targets: Element[] }[] = [];
  const blenders = new Map<string, (amount: number) => string>();
  /** Rest state of every stroke whose shape an act changed. */
  const reshaped = new Map<
    SVGPathElement,
    { d: string; dash: string | null; offset: string | null }
  >();

  function stroke(id: string): SVGPathElement {
    const el = strokeEls.get(id);
    if (!el) throw new Error(`fab: piece "${piece.id}" has no stroke "${id}"`);
    return el;
  }

  /** A stroke's outline path stands for the whole stroke (fill + outline). */
  const unit = (target: Element): Element =>
    target instanceof SVGPathElement ? layer.wrapperOf(target) ?? target : target;

  /** Change the shape of a stroke (outline and fill together). */
  function setShape(el: SVGPathElement, d: string) {
    if (!reshaped.has(el)) {
      reshaped.set(el, {
        d: el.getAttribute("d") ?? "",
        dash: el.getAttribute("stroke-dasharray"),
        offset: el.getAttribute("stroke-dashoffset"),
      });
    }
    // The dash was sized to the drawn shape; a new shape can be longer.
    el.removeAttribute("stroke-dasharray");
    el.removeAttribute("stroke-dashoffset");
    el.setAttribute("d", d);
    layer.fillOf(el)?.setAttribute("d", d);
  }

  function play(
    target: Element,
    keyframes: Keyframe[],
    options: KeyframeAnimationOptions,
  ): Animation {
    const a = unit(target).animate(keyframes, { fill: "forwards", ...options });
    animations.push(a);
    return a;
  }

  return {
    signal,
    stroke,
    pose(id, amount) {
      const el = stroke(id);
      let blend = blenders.get(id);
      if (!blend) {
        const def = piece.strokes.find((s) => s.id === id);
        if (!def?.poses?.length) {
          throw new Error(`fab: stroke "${id}" of "${piece.id}" has no poses`);
        }
        blend = createPoseBlender(id, def.d, def.poses);
        blenders.set(id, blend);
      }
      setShape(el, blend(amount));
    },
    show(ids, fadeMs = 0) {
      for (const id of Array.isArray(ids) ? ids : [ids]) {
        const el = stroke(id);
        const w = layer.wrapperOf(el);
        layer.reveal(el);
        if (w && fadeMs > 0) {
          animations.push(
            w.animate([{ opacity: 0 }, { opacity: 1 }], {
              duration: fadeMs,
              easing: "ease-in-out",
            }),
          );
        }
      }
    },
    limit(id, range) {
      layer.limit(stroke(id), range);
    },
    async hide(ids, fadeMs = 0) {
      const els = (Array.isArray(ids) ? ids : [ids]).map(stroke);
      if (fadeMs > 0) {
        const fades = els.map((el) =>
          play(el, [{ opacity: 1 }, { opacity: 0 }], { duration: fadeMs, easing: "ease-in-out" }),
        );
        try {
          await Promise.all(fades.map((a) => a.finished));
        } catch {
          if (signal.aborted) throw abortError();
        }
        for (const a of fades) a.cancel(); // else it would keep it at opacity 0 for the next show()
      }
      for (const el of els) layer.conceal(el);
    },
    setPath(id, d) {
      setShape(stroke(id), d);
    },
    hideBehind(ids, behindId, fadeMs = 0) {
      const behind = stroke(behindId);
      const host = behind.parentElement?.parentElement; // the fitted group
      if (!host) return;
      // A luminance mask: white everywhere, with the shape painted black on top.
      // Fading the black shape in fades the hiding in (a hard clip would pop).
      const mask = document.createElementNS(NS, "mask");
      mask.id = `fab-mask-${++maskSeq}`;
      mask.setAttribute("maskUnits", "userSpaceOnUse");
      for (const [k, v] of [["x", -5000], ["y", -5000], ["width", 10000], ["height", 10000]] as const) {
        mask.setAttribute(k, String(v));
      }
      const all = document.createElementNS(NS, "rect");
      for (const [k, v] of [["x", "-5000"], ["y", "-5000"], ["width", "10000"], ["height", "10000"], ["fill", "white"]]) {
        all.setAttribute(k, v);
      }
      const cut = document.createElementNS(NS, "path");
      cut.setAttribute("d", behind.getAttribute("d") ?? "");
      cut.setAttribute("fill", "black");
      cut.style.opacity = fadeMs > 0 ? "0" : "1";
      mask.append(all, cut);
      host.appendChild(mask);
      if (fadeMs > 0) {
        animations.push(
          cut.animate([{ opacity: 0 }, { opacity: 1 }], { duration: fadeMs, fill: "forwards", easing: "ease-in-out" }),
        );
      }
      const targets = ids.map((id) => unit(stroke(id)));
      for (const t of targets) t.setAttribute("mask", `url(#${mask.id})`);
      masks.push({ mask, targets });
    },
    spawn(task) {
      task().catch((e) => {
        if (!isAbort(e)) console.error(e);
      });
    },
    stage,
    tween: (ms, onFrame, ease = linear) =>
      animateValue(0, 1, ms, onFrame, signal, ease),
    pivot(name) {
      const p = piece.pivots?.[name];
      if (!p) throw new Error(`fab: piece "${piece.id}" has no pivot "${name}"`);
      return p;
    },
    wait: (ms) => wait(ms, signal),
    play,
    async animate(target, keyframes, options) {
      const a = play(target, keyframes, options);
      const onAbort = () => a.cancel();
      signal.addEventListener("abort", onAbort, { once: true });
      try {
        await a.finished;
      } catch {
        if (signal.aborted) throw abortError();
        // cancelled by dispose(): nothing left to wait for
      } finally {
        signal.removeEventListener("abort", onAbort);
      }
    },
    overlay(spec: OverlaySpec) {
      const outer = document.createElementNS(NS, "g");
      if (spec.transform) outer.setAttribute("transform", spec.transform);
      const inner = document.createElementNS(NS, "g");
      // Scale/rotate about the shape's own center, as the original wordmark did.
      inner.style.transformBox = "fill-box";
      inner.style.transformOrigin = "center";
      const path = document.createElementNS(NS, "path");
      path.setAttribute("d", spec.d);
      path.setAttribute("fill", spec.fill ?? "currentColor");
      inner.appendChild(path);
      outer.appendChild(inner);
      overlayHost.appendChild(outer);
      overlays.push(outer);
      return inner;
    },
    dispose() {
      for (const [el, rest] of reshaped) {
        el.setAttribute("d", rest.d);
        layer.fillOf(el)?.setAttribute("d", rest.d);
        if (rest.dash !== null) el.setAttribute("stroke-dasharray", rest.dash);
        if (rest.offset !== null) el.setAttribute("stroke-dashoffset", rest.offset);
      }
      reshaped.clear();
      for (const { mask, targets } of masks) {
        for (const t of targets) t.removeAttribute("mask");
        mask.remove();
      }
      masks.length = 0;
      ac.abort(); // stops spawned tasks and anything still awaiting this scene
      appSignal.removeEventListener("abort", stopWithApp);
      for (const a of animations) a.cancel();
      for (const o of overlays) o.remove();
      animations.length = 0;
      overlays.length = 0;
    },
  };
}
