/** Abort-aware timing primitives. Everything async in the fabricator uses these
 *  so `destroy()` unwinds the whole sequence instead of leaking a loop. */

export function abortError(): DOMException {
  return new DOMException("Aborted", "AbortError");
}

export function isAbort(e: unknown): boolean {
  return e instanceof DOMException && e.name === "AbortError";
}

export function easeInOutCubic(x: number): number {
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

export function wait(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) return reject(abortError());
    const onAbort = () => {
      clearTimeout(t);
      reject(abortError());
    };
    const t = setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    signal.addEventListener("abort", onAbort, { once: true });
  });
}

export const linear = (x: number): number => x;

export function animateValue(
  from: number,
  to: number,
  ms: number,
  onFrame: (v: number) => void,
  signal: AbortSignal,
  ease: (x: number) => number = easeInOutCubic,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const start = performance.now();
    function tick(now: number) {
      if (signal.aborted) return reject(abortError());
      // The first frame's timestamp can be a hair EARLIER than `start` (it is the frame's start time,
      // `start` is when this was called): a negative progress would overshoot backwards, and a
      // negative dash length is invalid, which draws the whole line for a frame.
      const raw = Math.min(1, Math.max(0, (now - start) / ms));
      onFrame(from + (to - from) * ease(raw));
      if (raw < 1) requestAnimationFrame(tick);
      else resolve();
    }
    requestAnimationFrame(tick);
  });
}

/** Run a Web Animation to completion; cancelled and rejected if `signal` aborts. */
export async function playAnimation(
  target: Element,
  keyframes: Keyframe[],
  options: KeyframeAnimationOptions,
  signal: AbortSignal,
): Promise<void> {
  const a = target.animate(keyframes, { fill: "forwards", ...options });
  const onAbort = () => a.cancel();
  signal.addEventListener("abort", onAbort, { once: true });
  try {
    await a.finished;
  } catch {
    if (signal.aborted) throw abortError();
  } finally {
    signal.removeEventListener("abort", onAbort);
  }
}
