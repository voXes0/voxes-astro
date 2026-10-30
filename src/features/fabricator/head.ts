import { CONFIG } from "./config";

/** The laser head: a dot with a decorative spinning triangle around it. Works in stage space. */
export function createHead(stage: SVGSVGElement, signal: AbortSignal) {
  const group = stage.querySelector<SVGGElement>("#fab-head-group");
  const triangle = stage.querySelector<SVGPolygonElement>("#fab-head-triangle");
  if (!group || !triangle) throw new Error("fab: head markup missing");

  // The spin only runs while the head is visible. CSS rotation about the SVG user-space origin.
  triangle.style.transformBox = "view-box";
  triangle.style.transformOrigin = "0 0";
  const spin = triangle.animate([{ transform: "rotate(0deg)" }, { transform: "rotate(360deg)" }], {
    duration: 360000 / CONFIG.headSpinDegPerSec,
    iterations: Infinity,
  });
  spin.pause();
  signal.addEventListener("abort", () => spin.cancel(), { once: true });

  let fading: Animation | null = null;
  let fadingIn = false;
  let fadeFrom = 0;
  let fadeTo = 0;

  /** The opacity on screen now. Mid-fade it comes from the animation: getComputedStyle would force a style recalc. */
  function opacityNow() {
    if (fading?.playState === "running") {
      return fadeFrom + (fadeTo - fadeFrom) * (fading.effect?.getComputedTiming().progress ?? 0);
    }
    return group!.style.opacity !== "" ? Number(group!.style.opacity) : parseFloat(getComputedStyle(group!).opacity);
  }

  function fade(from: number, to: number, duration: number, easing: string) {
    fadeFrom = from;
    fadeTo = to;
    return (fading = group!.animate([{ opacity: from }, { opacity: to }], { duration, easing }));
  }

  return {
    setPos(x: number, y: number) {
      group!.setAttribute("transform", `translate(${x},${y})`);
    },
    /** Fades in from wherever it is (it does not pop); a head that is already showing is left alone. */
    show() {
      if (fadingIn && fading?.playState === "running") return; // already on its way up
      const from = opacityNow(); // read before the fade is cancelled
      fading?.cancel();
      fading = null;
      fadingIn = false;
      group!.style.opacity = "1";
      spin.play();
      if (!(from < 0.98)) return;
      fadingIn = true;
      fade(from, 1, CONFIG.headFadeInMs * (1 - from), "ease-in-out");
    },
    /** Fades out (it does not vanish); `show()` fades it back in, even mid-fade. */
    hide() {
      const from = opacityNow();
      fading?.cancel();
      fading = null;
      fadingIn = false;
      group!.style.opacity = "0";
      if (!(from > 0.02)) return spin.pause(); // already gone
      const out = fade(from, 0, CONFIG.headFadeMs, "ease-out");
      out.onfinish = () => {
        if (fading === out) spin.pause();
      };
    },
    /**
     * Paint the head above everything (true) or back below the strokes, where it normally sits
     * (false). Opaque fills would hide it otherwise.
     */
    raise(on: boolean) {
      const layer = stage.querySelector("#fab-layer");
      if (on) stage.appendChild(group!);
      else if (layer) stage.insertBefore(group!, layer);
    },
  };
}

export type Head = ReturnType<typeof createHead>;
