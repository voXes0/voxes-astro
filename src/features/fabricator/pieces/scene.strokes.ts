// GENERATED — do not edit. Regenerate with:
//   node scripts/scene-from-svg.mjs art/scene-1.svg
// Everything is in the scene's own world coordinates (the SVG's user units).
// The flower's paths are never read from the drawing (src/features/fabricator/pieces/flower.ts owns them);
// only path4's first point is measured, to know where the flower stands.
import type { FabStroke, Point } from "../types";

/** The ground: the hill top and the cliff, then the ground that runs off to the left. */
export const groundStrokes: FabStroke[] = [
  { id: "ground-hill", d: "M311.78 97.19L240.57 97.19C234.82 97.19 229.05 92.48 220.42 93.22C215.82 93.61 213.11 95.44 210.96 100.72C209.92 103.24 208.81 105.85 208.05 108.25C205.9 114.09 204.24 119.43 203.07 124.28C201.57 129.47 199.88 132.91 198.63 140.32C197.56 146.25 194.7 145.51 188.45 147.38C185.79 147.27 182.05 149.44 179.49 149.36C176.8 149.36 170.51 150.42 169.14 150.42L156.41 150.42C141.84 149.5 134.64 150.43 126.71 149.36C123.7 148.95 121.8 149.95 118.14 147.38C115.82 145.26 111.87 141.41 111.57 141.15C110.16 140.05 106.58 138.65 104.95 138.57C101.42 138.48 101.97 139.09 98.85 138.57C95.14 137.94 95.13 137.89 91.37 138.07C87.73 138.24 82.42 137.62 79.7 137.87C74.1 138.39 68.77 138.72 64.71 138.51C61.56 138.35 58.28 138.95 54.51 138.87C52.01 138.82 49.58 138.37 47.2 137.97" },
  { id: "ground-left", d: "M47.2 137.97C35.09 136.33 25.12 137.55 15.26 137.97C10.32 138.18 5.49 137.6 0.27 137.55" },
];

/** The water (a fill with no outline: the area under the line, down to the ground), then its line. */
export const puddleStrokes: FabStroke[] = [
  { id: "puddle-fill", d: "M198.63 140.32L198.49 141.02L198.33 141.67L198.14 142.25L197.94 142.77L197.72 143.24L197.47 143.66L197.2 144.03L196.91 144.37L196.59 144.66L196.25 144.93L195.88 145.16L195.48 145.37L195.06 145.56L194.61 145.73L193.63 146.03L189.95 146.96L188.45 147.38L188.12 147.37L187.77 147.39L187.41 147.43L187.04 147.49L186.29 147.65L185.12 147.98L182.36 148.85L181.6 149.07L180.86 149.23L180.16 149.33L179.82 149.35L178.75 149.38L177.88 149.44L176.93 149.52L174.87 149.76L170.56 150.3L169.58 150.4L169.14 150.42L156.41 150.42L154.62 150.32L151.27 150.15L146.73 150.01L142.7 149.96L135.75 149.92L133.66 149.88L131.65 149.8L129.67 149.67L127.7 149.48L126.34 149.31L125.98 149.28L125.29 149.25L123.32 149.22L122.67 149.18L122.01 149.09L121.67 149.03L120.97 148.84L120.23 148.56L119.84 148.39L119.44 148.18L119.02 147.95L118.59 147.68L118.14 147.38L115.47 144.88L111.57 141.15L110.95 140.73L110.21 140.32Z", fill: true, outline: false },
  { id: "puddle", d: "M110.21 140.32L198.63 140.32Z" },
];

/** Stem (drawn from its foot upward), then each leaf: outline, vein. */
export const plantStrokes: FabStroke[] = [
  { id: "stem", d: "M220.42 93.22C219.49 90.76 219.62 83.53 217.04 75.72C213.95 66.37 214.49 68.5 212.27 59.07" },
  { id: "leaf-1", d: "M213.87 70.63C215.57 71.59 215.58 72.56 216.18 72.81C216.24 72.83 216.18 72.81 213.19 72.27C211.14 71.82 208.4 70.15 208.97 69.81C209.67 69.4 212.89 70.06 213.87 70.63Z", fill: true },
  { id: "leaf-1-vein", d: "M216.18 72.81L216.18 72.81C214.63 71.74 213.02 71.01 211.37 70.61" },
  { id: "leaf-2", d: "M216.25 66.2C214.9 67.62 215.51 68.59 215 69.01C214.95 69.05 215.69 68.94 217.6 67.47C218.8 66.54 221.37 64.34 221.08 64.03C220.55 63.45 217.37 64.99 216.25 66.2Z", fill: true },
  { id: "leaf-2-vein", d: "M215 69.01L215.22 68.98C216.25 67.11 218.2 65.64 219.32 65.04" },
];

/** The sun's disc. */
export const sunDisc = { x: 161.842, y: 17.651, r: 17.651 };

/** Where the bird's own coordinate space (bird.strokes.ts) sits in the world. */
export const birdOrigin: Point = { x: 57.424, y: 91.188 };

/** The wing hinge in the world: the point the bird's flight tracks. */
export const birdPivot: Point = { x: 91.361, y: 113.974 };

/** The rough path the bird follows (world coordinates). */
export const flyPath = "M90.38 113.97L90.38 72.26C90.38 52.63 107.22 45.89 137.29 45.89L323.08 45.89";

/** Add this to the flower's own coordinates (flower.ts) to get world coordinates. */
export const flowerOffset: Point = { x: 46.936, y: 52.633 };
