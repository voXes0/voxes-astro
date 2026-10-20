import { abortError } from "./timing";
import type { Point } from "./types";

/**
 * A bird flying "roughly" along a drawn path.
 *
 * Following a path exactly looks like a bead on a wire. This one follows the path
 * the way a bird would: it accelerates from rest and surges a little as it goes,
 * wanders to either side of the line (two slow waves that never line up), bobs on
 * every wing beat and, as it heads away toward the flower, shrinks the way something
 * moving off into the picture (the z direction the drawing does not have) would. It
 * stays level, like a bird: it never tilts toward its direction of travel. All of it
 * fades in from the take-off, so the bird leaves the ground exactly where it stood.
 *
 * It moves one element: `el` gets a transform every frame, about `rest`, the
 * point of the bird that tracks the path (its wing hinge). Nothing else is touched;
 * the camera is the caller's, through `onFrame`.
 */
export interface FlightOptions {
  /** SVG path data of the line to follow. */
  path: string;
  /** Added to every point of `path` (the path is drawn where the bird was, the bird may have been moved). */
  offset?: Point;
  /** The element that carries the bird (the layer's wrapper). */
  el: SVGGElement;
  /** Where the tracked point of the bird is before it moves. */
  rest: Point;
  signal: AbortSignal;
  /** performance.now() when the wings started beating, and their period: the body bobs in step. */
  wings?: { startedAt: number; periodMs: number };
  /** Cruise speed (world units per second) and how long it takes to get there (s). */
  speed?: number;
  accelSeconds?: number;
  /** Perspective: the bird shrinks between these x positions, down to 1 / (1 + depth). */
  perspective?: { fromX: number; toX: number; depth: number; curve: number };
  /** Called every frame: where the bird is (its path position, without the bob), its scale, frame time. */
  onFrame?(pos: Point, scale: number, dt: number): void;
}

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const smooth = (x: number) => x * x * (3 - 2 * x);

export function fly(opts: FlightOptions): Promise<void> {
  const {
    path: d,
    offset = { x: 0, y: 0 },
    el,
    rest,
    signal,
    wings,
    speed = 50,
    accelSeconds = 1.4,
    perspective = { fromX: 110, toX: 330, depth: 1.1, curve: 1.8 },
    onFrame,
  } = opts;

  const NS = "http://www.w3.org/2000/svg";
  const line = document.createElementNS(NS, "path");
  line.setAttribute("d", d);
  const length = line.getTotalLength();
  const start = line.getPointAtLength(0);
  const fixX = rest.x - (start.x + offset.x); // the path starts a hair beside the hinge: blend that out
  const fixY = rest.y - (start.y + offset.y);

  return new Promise<void>((resolve, reject) => {
    let s = 0; // distance travelled along the path
    let t0 = -1;
    let last = 0;

    function frame(now: number) {
      if (signal.aborted) return reject(abortError());
      if (t0 < 0) {
        t0 = now;
        last = now;
      }
      const T = (now - t0) / 1000;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      // speed: eased start, then a slow surge and a quicker flutter on top
      const v =
        speed *
        smooth(clamp01(T / accelSeconds)) *
        (1 + 0.1 * Math.sin((2 * Math.PI * T) / 1.7 + 0.6) + 0.05 * Math.sin((2 * Math.PI * T) / 0.63));
      s = Math.min(length, s + v * dt);

      const raw = line.getPointAtLength(s);
      const p = { x: raw.x + offset.x, y: raw.y + offset.y };
      const ahead = line.getPointAtLength(Math.min(length, s + 2));
      const back = line.getPointAtLength(Math.max(0, s - 2));
      const tangent = Math.atan2(ahead.y - back.y, ahead.x - back.x); // radians, y down

      // perspective: smaller the further along toward the flower
      const q = clamp01((p.x - perspective.fromX) / (perspective.toX - perspective.fromX));
      const scale = 1 / (1 + perspective.depth * Math.pow(q, perspective.curve));

      // wander to the sides of the line; calm at the very start, and smaller when far away
      const sway =
        (0.62 * Math.sin((2 * Math.PI * T) / 2.3 + 1.1) + 0.38 * Math.sin((2 * Math.PI * T) / 1.15 + 2.6)) *
        3.2 *
        smooth(clamp01(s / 25)) *
        Math.sqrt(scale);
      const nx = -Math.sin(tangent);
      const ny = Math.cos(tangent);

      // bob: the body rises on the down-beat
      let bob = 0;
      if (wings) {
        const ph = (((now - wings.startedAt) % wings.periodMs) + wings.periodMs) % wings.periodMs / wings.periodMs;
        const hump = ph > 0.4 ? Math.sin((Math.PI * (ph - 0.4)) / 0.6) : -0.25 * Math.sin((Math.PI * ph) / 0.4);
        bob = -1.0 * hump * scale * smooth(clamp01(T / 0.6));
      }

      const blend = 1 - smooth(clamp01(s / 40));
      const pos = { x: p.x + fixX * blend, y: p.y + fixY * blend };
      const x = pos.x + nx * sway;
      const y = pos.y + ny * sway + bob;


      el.setAttribute(
        "transform",
        `translate(${x.toFixed(3)} ${y.toFixed(3)}) scale(${scale.toFixed(4)}) translate(${-rest.x} ${-rest.y})`,
      );
      onFrame?.(pos, scale, dt);

      if (s >= length) return resolve();
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  });
}
