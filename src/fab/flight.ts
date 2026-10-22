import { samplePath } from "./morph";
import { abortError, nextFrame } from "./timing";
import type { Point } from "./types";
import { clamp01, smooth } from "./util";

/**
 * A bird flying "roughly" along a drawn path, so it doesn't look like a bead on a wire: it
 * accelerates from rest, surges, wanders to either side of the line, bobs on every wing beat and
 * shrinks as it heads away into the picture. It stays level (never tilts along its heading) and
 * leaves the ground exactly where it stood.
 *
 * It only moves `el` (a transform each frame, about `rest`, the point that tracks the path: the
 * wing hinge). The camera is the caller's, through `onFrame`.
 */
export interface FlightOptions {
  /** SVG path data of the line to follow. */
  path: string;
  /** Added to every point of `path` (the path was drawn where the bird was, it may have moved since). */
  offset?: Point;
  /** The element that carries the bird (the layer's wrapper). */
  el: SVGGElement;
  /** Where the tracked point of the bird is before it moves. */
  rest: Point;
  signal: AbortSignal;
  /** frameNow() when the wings started beating, and their period: the body bobs in step. */
  wings?: { startedAt: number; periodMs: number };
  /** Cruise speed (world units per second) and the time to reach it (s). */
  speed?: number;
  accelSeconds?: number;
  /** Perspective: the bird shrinks between these x positions, down to 1 / (1 + depth). */
  perspective?: { fromX: number; toX: number; depth: number; curve: number };
  /** Every frame: where the bird is (path position, without the bob), its scale, frame time. */
  onFrame?(pos: Point, scale: number, dt: number): void;
}


export function fly(opts: FlightOptions): Promise<void> {
  const {
    path,
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

  // The path never changes: sample it once and interpolate, instead of three getPointAtLength per frame.
  const { pts, length } = samplePath(path, 0.5);
  const last = pts.length - 1;
  const pointAt = (s: number): Point => {
    const f = (clamp01(s / length) * last);
    const i = Math.min(last - 1, Math.floor(f));
    const k = f - i;
    return { x: pts[i][0] + (pts[i + 1][0] - pts[i][0]) * k, y: pts[i][1] + (pts[i + 1][1] - pts[i][1]) * k };
  };

  const start = pointAt(0);
  const fixX = rest.x - (start.x + offset.x); // the path starts a hair beside the hinge: blend that out
  const fixY = rest.y - (start.y + offset.y);

  return new Promise<void>((resolve, reject) => {
    let s = 0; // distance travelled along the path
    let t0 = -1;
    let prev = 0;

    function frame(now: number) {
      if (signal.aborted) return reject(abortError());
      if (t0 < 0) t0 = prev = now;
      const T = (now - t0) / 1000;
      const dt = Math.min(0.05, (now - prev) / 1000);
      prev = now;

      // speed: eased start, then a slow surge and a quicker flutter on top
      const v =
        speed *
        smooth(clamp01(T / accelSeconds)) *
        (1 + 0.1 * Math.sin((2 * Math.PI * T) / 1.7 + 0.6) + 0.05 * Math.sin((2 * Math.PI * T) / 0.63));
      s = Math.min(length, s + v * dt);

      const raw = pointAt(s);
      const p = { x: raw.x + offset.x, y: raw.y + offset.y };
      const ahead = pointAt(s + 2);
      const back = pointAt(s - 2);
      const tangent = Math.atan2(ahead.y - back.y, ahead.x - back.x); // radians, y down

      // smaller the further along toward the flower
      const q = clamp01((p.x - perspective.fromX) / (perspective.toX - perspective.fromX));
      const scale = 1 / (1 + perspective.depth * Math.pow(q, perspective.curve));

      // wander to the sides of the line: calm at the start, smaller when far away
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
        const ph = ((((now - wings.startedAt) % wings.periodMs) + wings.periodMs) % wings.periodMs) / wings.periodMs;
        const hump = ph > 0.4 ? Math.sin((Math.PI * (ph - 0.4)) / 0.6) : -0.25 * Math.sin((Math.PI * ph) / 0.4);
        bob = -hump * scale * smooth(clamp01(T / 0.6));
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
      nextFrame(frame);
    }
    nextFrame(frame);
  });
}
