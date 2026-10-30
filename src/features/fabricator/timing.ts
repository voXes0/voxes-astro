/** Abort-aware timing primitives. Everything async in the fabricator uses these
 *  so `destroy()` unwinds the whole sequence instead of leaking a loop. */

type Handle = { cb: ((now: number) => void) | null };

const MIN_GAP_MS = 10; // 60 fps on a 120 Hz screen, every frame on 60/90 Hz
const HALF_GAP_MS = 30;
const SLOW_MS = 22; // average frame gap that counts as "can't keep up"
const RECHECK_MS = 12000; // how long to stay at half rate before trying full rate again

let queue: Handle[] = [];
let scheduled = false;
let lastRun = 0;
let avgGap = 16.7;
let halfUntil = 0; // at half rate until then
const pauses = new Set<string>();
let pausedAt = 0;
let pausedTotal = 0;

/** The clock animations should use: `performance.now()` minus the time spent frozen. */
export const frameNow = (): number => performance.now() - pausedTotal - (pauses.size ? performance.now() - pausedAt : 0);

function pump(real: number) {
  scheduled = false;
  if (pauses.size) return; // setFramePause(…, false) restarts it
  const gap = real < halfUntil ? HALF_GAP_MS : MIN_GAP_MS;
  if (real - lastRun < gap) return schedule();
  const sinceLast = real - lastRun;
  lastRun = real;
  if (real >= halfUntil) {
    // full rate: watch the gap between frames (long gaps are idle time, not slowness)
    if (sinceLast < 250) avgGap += (sinceLast - avgGap) * 0.1;
    if (avgGap > SLOW_MS) {
      halfUntil = real + RECHECK_MS;
      avgGap = 16.7; // judged afresh when full rate is tried again
    }
  }
  const run = queue;
  queue = [];
  const now = real - pausedTotal;
  for (const h of run) h.cb?.(now);
}

function schedule() {
  if (scheduled || pauses.size || queue.length === 0) return;
  scheduled = true;
  requestAnimationFrame(pump);
}

/** Like requestAnimationFrame (the callback gets the virtual clock); returns a cancel function. */
export function nextFrame(cb: (now: number) => void): () => void {
  const h: Handle = { cb };
  queue.push(h);
  schedule();
  return () => {
    h.cb = null;
  };
}

/** Freeze (or resume) every frame loop; frozen while any reason is set. */
export function setFramePause(reason: string, on: boolean) {
  const before = pauses.size;
  if (on) pauses.add(reason);
  else pauses.delete(reason);
  if (before === 0 && pauses.size > 0) pausedAt = performance.now();
  if (before > 0 && pauses.size === 0) {
    pausedTotal += performance.now() - pausedAt;
    lastRun = 0;
    schedule();
  }
}

/**
 * Freeze the frame loops while `target` is off screen or the tab is hidden,
 * so they don't spend main-thread time nobody sees. Returns the cleanup.
 */
export function pauseWhenNotWatched(target: Element): () => void {
  const io = new IntersectionObserver((entries) => setFramePause("offscreen", !entries[entries.length - 1].isIntersecting));
  io.observe(target);
  const onVisibility = () => setFramePause("hidden", document.hidden);
  document.addEventListener("visibilitychange", onVisibility);
  onVisibility();

  return () => {
    io.disconnect();
    document.removeEventListener("visibilitychange", onVisibility);
    // let loops that are waiting see their abort and unwind
    for (const r of ["offscreen", "hidden"]) setFramePause(r, false);
  };
}

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

/** Calls `onFrame` with `from` -> `to` (eased) over `ms`. Rejects with an AbortError once the signal aborts. */
export function animateValue(
  from: number,
  to: number,
  ms: number,
  onFrame: (v: number) => void,
  signal: AbortSignal,
  ease: (x: number) => number = easeInOutCubic,
): Promise<void> {
  // `frames` never reports negative time: the first frame's timestamp can be a hair EARLIER than the
  // call, and a negative progress would overshoot backwards (a negative dash length is invalid,
  // which draws the whole line for a frame).
  return frames(signal, (_dt, t) => {
    const raw = Math.min(1, (t * 1000) / ms);
    onFrame(from + (to - from) * ease(raw));
    return raw >= 1;
  });
}

/**
 * Calls `step(dt, t, now)` every frame (dt in seconds, capped at 50 ms; t = seconds since the call)
 * until it returns true or `maxMs` passes. Rejects with an AbortError once the signal aborts.
 */
export function frames(
  signal: AbortSignal,
  step: (dt: number, t: number, now: number) => boolean | void,
  maxMs = Infinity,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const t0 = frameNow();
    let last = t0;
    const tick = (now: number) => {
      if (signal.aborted) return reject(abortError());
      const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
      last = now;
      const t = Math.max(0, now - t0) / 1000;
      if (step(dt, t, now) === true || t * 1000 > maxMs) return resolve();
      nextFrame(tick);
    };
    nextFrame(tick);
  });
}
