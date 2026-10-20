import { CONFIG } from "./config";

/** The laser head: a dot with a decorative spinning triangle around it.
 *  The only code that positions, shows or spins it. Works in stage space. */
export function createHead(stage: SVGSVGElement, signal: AbortSignal) {
  const group = stage.querySelector<SVGGElement>("#fab-head-group");
  const triangle = stage.querySelector<SVGPolygonElement>("#fab-head-triangle");
  if (!group || !triangle) throw new Error("fab: head markup missing");

  // Independent of draw/travel timing — purely decorative.
  let last: number | null = null;
  let angle = 0;
  function tick(now: number) {
    if (signal.aborted) return;
    if (last !== null) {
      angle =
        (angle + ((now - last) / 1000) * CONFIG.headSpinDegPerSec) % 360;
      triangle!.setAttribute("transform", `rotate(${angle})`);
    }
    last = now;
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  let fading: Animation | null = null;
  let fadingIn = false;

  return {
    setPos(x: number, y: number) {
      group!.setAttribute("transform", `translate(${x},${y})`);
    },
    /** Fades in from wherever it is (it does not pop); a head that is already showing is left alone. */
    show() {
      if (fadingIn && fading?.playState === "running") return; // already on its way up
      const from = parseFloat(getComputedStyle(group!).opacity); // read before the fade is cancelled
      fading?.cancel();
      fading = null;
      fadingIn = false;
      group!.style.opacity = "1";
      if (!(from < 0.98)) return;
      fadingIn = true;
      fading = group!.animate([{ opacity: from }, { opacity: 1 }], {
        duration: CONFIG.headFadeInMs * (1 - from),
        easing: "ease-in-out",
      });
    },
    /** Fades out (it does not vanish); `show()` fades it back in, even mid-fade. */
    hide() {
      const from = parseFloat(getComputedStyle(group!).opacity);
      fading?.cancel();
      fading = null;
      fadingIn = false;
      group!.style.opacity = "0";
      if (!(from > 0.02)) return; // already gone
      fading = group!.animate([{ opacity: from }, { opacity: 0 }], {
        duration: CONFIG.headFadeMs,
        easing: "ease-out",
      });
    },
    /**
     * Paint the head above everything (true) or back below the strokes, where it
     * normally sits (false). Opaque fills would hide it otherwise.
     */
    raise(on: boolean) {
      const layer = stage.querySelector("#fab-layer");
      if (on) stage.appendChild(group!);
      else if (layer) stage.insertBefore(group!, layer);
    },
  };
}

export type Head = ReturnType<typeof createHead>;
