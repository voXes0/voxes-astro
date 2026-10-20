import { STAGE_SIZE } from "./config";
import type { LayerView } from "./engine";
import { abortError, easeInOutCubic } from "./timing";
import type { Point } from "./types";

/**
 * The camera: a window onto a *world* that is bigger than the stage.
 *
 * Pieces placed in a chapter live in world coordinates (their `fit` is world
 * placement). The camera maps the world onto the 300x300 stage:
 *
 *   stage = (world - centre) * zoom + (150, 150)
 *
 * A chapter picks the zoom at the start (`setView`) and can push in or pull out later
 * (`moveTo`, `frame`). Strokes keep the same weight on screen however far in the camera
 * is: layers listen to `onZoom` and re-weigh their lines and glow (see engine.ts).
 * "Zoom" effects that belong to the objects (a bird that shrinks as it flies away)
 * are still the objects' business.
 *
 * Only the camera moves the world group; nothing else may touch its transform.
 */
export interface Camera {
  /** The group everything in the world is drawn into. */
  readonly host: SVGGElement;
  /** What a layer needs to place itself and map its laser head (see LayerView). */
  readonly view: LayerView;
  /** Stage units per world unit. */
  readonly zoom: number;
  /** World point at the centre of the frame. */
  readonly x: number;
  readonly y: number;
  /** How many world units fit across the stage now. */
  readonly across: number;
  /** Choose how many world units fit across the stage (the first call, before adding pieces, sets the home view). */
  setView(worldUnitsAcross: number): void;
  /** Change only the zoom, at once (the camera keeps its position and its motion). */
  setAcross(across: number): void;
  /** Put the camera at `x`, `y` with `across` world units in view, at once (zero velocity). */
  frame(x: number, y: number, across: number): void;
  /**
   * Glide to `x`, `y`, `across` over `ms`: one smooth ease for the position and for the zoom
   * (the zoom runs in log space, so pushing in feels even). Resolves when it has arrived.
   */
  moveTo(to: { x: number; y: number; across: number }, ms: number, ease?: (u: number) => number): Promise<void>;
  /** Put the camera somewhere (no motion). */
  set(x: number, y: number): void;
  /**
   * One step of a critically damped chase: the camera accelerates toward `target`
   * and settles on it without overshooting, like an operator tracking a subject.
   * `omega` is how eager it is (rad/s; ~3 settles in about a second and a half).
   */
  chase(target: Point, dtSeconds: number, omega?: number): void;
  /**
   * Let the frame drift a little around where the camera is (a slow, never-repeating sway
   * of `amplitude` world units), so even a camera at rest feels held rather than locked.
   * Eases in and out; 0 stops it. Does not affect `chase`/`settled`.
   */
  drift(amplitude: number): void;
  /** Has the camera come to rest (on `target`, if given)? */
  settled(target?: Point, eps?: number): boolean;
  /** World -> stage. */
  project(p: Point): Point;
  /** The part of the world in frame right now. */
  visible(): { x: number; y: number; width: number; height: number };
}

export function createCamera(stage: SVGSVGElement, signal: AbortSignal): Camera {
  const host = stage.querySelector<SVGGElement>("#fab-world");
  if (!host) throw new Error("fab: world markup missing");
  const half = STAGE_SIZE / 2;
  let zoom = 1;
  /** The zoom of the first `setView`: the drift is sized for it, and kept the same size on screen when zoomed. */
  let homeZoom = 0;
  const listeners = new Set<() => void>();
  let x = 0;
  let y = 0;
  let vx = 0;
  let vy = 0;
  // drift: an offset on top of the camera's position, from two slow waves that never line up
  let driftTarget = 0;
  let driftAmp = 0;
  let dx = 0;
  let dy = 0;
  let driftRunning = false;

  function setZoom(z: number) {
    if (z === zoom) return;
    zoom = z;
    for (const l of listeners) l();
  }

  const project = (p: Point): Point => ({
    x: (p.x - (x + dx)) * zoom + half,
    y: (p.y - (y + dy)) * zoom + half,
  });
  const apply = () =>
    host.setAttribute("transform", `translate(${half} ${half}) scale(${zoom}) translate(${-(x + dx)} ${-(y + dy)})`);

  function driftLoop() {
    if (driftRunning) return;
    driftRunning = true;
    let last = performance.now();
    const tick = (now: number) => {
      if (signal.aborted) return;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      driftAmp += (driftTarget - driftAmp) * (1 - Math.exp(-dt * 0.9));
      const T = now / 1000;
      const k = homeZoom / zoom; // the same sway on screen whatever the zoom
      dx = k * driftAmp * (0.65 * Math.sin(T * 0.43 + 0.4) + 0.35 * Math.sin(T * 0.97 + 2.1));
      dy = k * driftAmp * 0.7 * (0.6 * Math.sin(T * 0.37 + 1.7) + 0.4 * Math.sin(T * 0.83));
      apply();
      if (driftTarget === 0 && driftAmp < 0.005) {
        dx = dy = driftAmp = 0;
        apply();
        driftRunning = false;
        return;
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  const camera: Camera = {
    host,
    // `zoom` is read when a layer is created, so the view is a live object
    view: {
      host,
      get zoom() {
        return zoom;
      },
      project,
      onZoom(listener) {
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
    },
    get zoom() {
      return zoom;
    },
    get x() {
      return x;
    },
    get y() {
      return y;
    },
    get across() {
      return STAGE_SIZE / zoom;
    },
    setView(across) {
      setZoom(STAGE_SIZE / across);
      if (!homeZoom) homeZoom = zoom;
      apply();
    },
    setAcross(across) {
      setZoom(STAGE_SIZE / across);
      apply();
    },
    frame(nx, ny, across) {
      x = nx;
      y = ny;
      vx = 0;
      vy = 0;
      setZoom(STAGE_SIZE / across);
      apply();
    },
    async moveTo(to, ms, ease = easeInOutCubic) {
      const from = { x, y, lz: Math.log(zoom) };
      const lz1 = Math.log(STAGE_SIZE / to.across);
      vx = 0;
      vy = 0;
      await new Promise<void>((resolve, reject) => {
        const t0 = performance.now();
        const tick = (now: number) => {
          if (signal.aborted) return reject(abortError());
          const u = Math.min(1, Math.max(0, (now - t0) / ms));
          const e = ease(u);
          x = from.x + (to.x - from.x) * e;
          y = from.y + (to.y - from.y) * e;
          setZoom(Math.exp(from.lz + (lz1 - from.lz) * e));
          apply();
          if (u < 1) requestAnimationFrame(tick);
          else resolve();
        };
        requestAnimationFrame(tick);
      });
    },
    set(nx, ny) {
      x = nx;
      y = ny;
      vx = 0;
      vy = 0;
      apply();
    },
    chase(target, dt, omega = 3) {
      // semi-implicit Euler in small steps: stable however long a frame took
      const steps = Math.max(1, Math.ceil(dt / 0.008));
      const h = dt / steps;
      for (let i = 0; i < steps; i++) {
        vx += (omega * omega * (target.x - x) - 2 * omega * vx) * h;
        vy += (omega * omega * (target.y - y) - 2 * omega * vy) * h;
        x += vx * h;
        y += vy * h;
      }
      apply();
    },
    drift(amplitude) {
      driftTarget = amplitude;
      if (amplitude > 0) driftLoop();
    },
    settled(target, eps = 0.15) {
      const near = target ? Math.hypot(target.x - x, target.y - y) < eps : true;
      return near && Math.hypot(vx, vy) < eps;
    },
    project,
    visible() {
      const w = STAGE_SIZE / zoom;
      return { x: x + dx - w / 2, y: y + dy - w / 2, width: w, height: w };
    },
  };
  return camera;
}
