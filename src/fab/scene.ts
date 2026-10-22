import type { Layer } from "./engine";
import { createPoseBlender } from "./pose";
import { abortError, animateValue, isAbort, linear, wait } from "./timing";
import type { Piece, Scene } from "./types";
import { SVG_NS as NS } from "./config";

let maskSeq = 0;
const asList = <T>(x: T | T[]): T[] => (Array.isArray(x) ? x : [x]);

/**
 * The toolbox handed to a piece's `act`. It tracks what an act creates or changes (animations,
 * reshaped strokes, masks) so `dispose()` can undo it all: acts never clean up.
 */
export function createScene(
  piece: Piece,
  strokeEls: Map<string, SVGPathElement>,
  layer: Layer,
  appSignal: AbortSignal,
): Scene & { dispose(): void } {
  // Aborted when the fabricator stops or this piece is torn down, so spawned tasks never outlive it.
  const ac = new AbortController();
  const signal = ac.signal;
  const stopWithApp = () => ac.abort();
  appSignal.addEventListener("abort", stopWithApp, { once: true });

  const animations: Animation[] = [];
  const masks: { mask: SVGElement; targets: Element[] }[] = [];
  const blenders = new Map<string, (amount: number) => string>();
  /** Rest state of every stroke an act reshaped. */
  const reshaped = new Map<
    SVGPathElement,
    { d: string; dash: string | null; offset: string | null }
  >();

  function stroke(id: string): SVGPathElement {
    const el = strokeEls.get(id);
    if (!el) throw new Error(`fab: piece "${piece.id}" has no stroke "${id}"`);
    return el;
  }

  /** The outline path stands for the whole stroke: its wrapper holds fill and outline. */
  const unit = (target: Element): Element =>
    target instanceof SVGPathElement ? layer.wrapperOf(target) ?? target : target;

  /** Change the shape of a stroke, outline and fill together. */
  function setShape(el: SVGPathElement, d: string) {
    if (!reshaped.has(el)) {
      reshaped.set(el, {
        d: el.getAttribute("d") ?? "",
        dash: el.getAttribute("stroke-dasharray"),
        offset: el.getAttribute("stroke-dashoffset"),
      });
    }
    el.removeAttribute("stroke-dasharray"); // sized to the drawn shape; a new one can be longer
    el.removeAttribute("stroke-dashoffset");
    writeShape(el, d);
  }
  const writeShape = (el: SVGPathElement, d: string) => {
    el.setAttribute("d", d);
    layer.fillOf(el)?.setAttribute("d", d);
  };

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
      for (const id of asList(ids)) {
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
      const els = asList(ids).map(stroke);
      if (fadeMs > 0) {
        const fades = els.map((el) =>
          play(el, [{ opacity: 1 }, { opacity: 0 }], { duration: fadeMs, easing: "ease-in-out" }),
        );
        try {
          await Promise.all(fades.map((a) => a.finished));
        } catch {
          if (signal.aborted) throw abortError();
        }
        for (const a of fades) a.cancel(); // else it would hold opacity 0 for the next show()
      }
      for (const el of els) layer.conceal(el);
    },
    setPath(id, d) {
      const el = stroke(id);
      layer.widen(el); // it can go anywhere now: its glow needs the piece-wide region
      setShape(el, d);
    },
    hideBehind(ids, behindId, fadeMs = 0) {
      const behind = stroke(behindId);
      const host = behind.parentElement?.parentElement as SVGGElement | null | undefined; // the fitted group
      if (!host) return;
      // Luminance mask: white everywhere, the shape black on top. Fading the black in fades the hiding in.
      const mask = document.createElementNS(NS, "mask");
      mask.id = `fab-mask-${++maskSeq}`;
      mask.setAttribute("maskUnits", "userSpaceOnUse");
      // Only the piece's own box: a big region makes every masked group costly to paint.
      const box = host.getBBox();
      const pad = 20;
      const region = { x: box.x - pad, y: box.y - pad, width: box.width + 2 * pad, height: box.height + 2 * pad };
      for (const [k, v] of Object.entries(region)) mask.setAttribute(k, String(v));
      const all = document.createElementNS(NS, "rect");
      for (const [k, v] of Object.entries({ ...region, fill: "white" })) all.setAttribute(k, String(v));
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
    tween: (ms, onFrame, ease = linear) =>
      animateValue(0, 1, ms, onFrame, signal, ease),
    wait: (ms) => wait(ms, signal),
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
    dispose() {
      for (const [el, rest] of reshaped) {
        writeShape(el, rest.d);
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
      animations.length = 0;
    },
  };
}
