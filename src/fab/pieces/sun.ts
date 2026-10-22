import { frameNow } from "../timing";
import { clamp01 } from "../util";
import type { Piece, Scene } from "../types";
import { sunDisc } from "./scene.strokes";

/**
 * The sun, in world coordinates. The laser draws only the disc. The soft bloom and the rays exist
 * from the start, hidden; `igniteSun` brings them on once the disc is there (bloom fades up, rays pop
 * outward one by one, then turn for as long as the sun is on stage).
 *
 * The rays change shape every frame, so they are drawn at full extent: the glow filter's region
 * (sized from the strokes' outlines) already covers them.
 */
const { x: CX, y: CY, r: R } = sunDisc;

const N_RAYS = 16;
const RAY_IN = 1.16 * R;
const RAY_LONG = 1.52 * R;
const RAY_SHORT = 1.34 * R;

const n = (v: number) => String(Math.round(v * 1000) / 1000);
const circle = (r: number) =>
  `M${n(CX)} ${n(CY - r)} A${n(r)} ${n(r)} 0 1 1 ${n(CX)} ${n(CY + r)} A${n(r)} ${n(r)} 0 1 1 ${n(CX)} ${n(CY - r)} Z`;

/** The rays at turn `theta` (radians); `grow(i)` is 0..1 of each ray's length. */
function rays(theta: number, grow: (i: number) => number): string {
  const parts: string[] = [];
  for (let i = 0; i < N_RAYS; i++) {
    const g = grow(i);
    if (g < 0.02) continue; // a zero-length round-capped line would still leave a dot
    const a = theta + (i * 2 * Math.PI) / N_RAYS;
    const out = i % 2 === 0 ? RAY_LONG : RAY_SHORT;
    const r2 = RAY_IN + (out - RAY_IN) * g;
    const c = Math.cos(a);
    const s = Math.sin(a);
    parts.push(`M${n(CX + RAY_IN * c)} ${n(CY + RAY_IN * s)} L${n(CX + r2 * c)} ${n(CY + r2 * s)}`);
  }
  return parts.join(" ") || `M${n(CX)} ${n(CY)}`;
}

export const sun: Piece = {
  id: "sun",
  fit: { x: 0, y: 0, scale: 1 },
  glow: 1.5,
  line: 0.9,
  strokes: [
    // behind everything: the bloom, a gradient-filled disc with no outline
    { id: "sun-bloom", d: circle(3.2 * R), hidden: true, outline: false, fill: true, fillColor: "url(#fab-sun-bloom)" },
    { id: "sun-rays", d: rays(0, () => 1), hidden: true, line: 1.15 },
    // the only thing the laser draws
    { id: "sun-disc", d: circle(R), fill: true },
  ],
};

const easeOutBack = (x: number) => {
  const c1 = 2.2;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
};

/**
 * Light the sun. Resolves when the rays have all popped out (about a second); the
 * rays keep turning until the sun's piece is torn down.
 */
export async function igniteSun(s: Scene): Promise<void> {
  // The rays are stored at full length (so the glow region fits them). Put them at zero
  // BEFORE they are shown, or they would flash at full length until the first frame.
  s.setPath("sun-rays", rays(0, () => 0));
  s.show(["sun-bloom"], 900);
  s.show(["sun-rays"]);

  const t0 = frameNow();
  s.spawn(() =>
    // a frame loop that lives as long as the sun does (the scene's signal ends it)
    s.tween(1e12, () => {
      const T = (frameNow() - t0) / 1000;
      s.setPath("sun-rays", rays(T * 0.2, (i) => easeOutBack(clamp01((T - i * 0.04) / 0.5))));
    }),
  );

  await s.wait(1000);
}
