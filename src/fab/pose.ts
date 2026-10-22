import { PATH_TOKEN as TOKEN, round3 } from "./util";
/**
 * Blending a stroke between its poses.
 *
 * All poses of a stroke share one node structure (the importer guarantees it),
 * so a pose is the same sequence of path commands with different numbers.
 * Blending is therefore a per-number interpolation — no path parsing beyond
 * splitting the string into commands and numbers.
 */
const isNumber = (t: string) => /^[-+.\d]/.test(t);

interface Tokens {
  tokens: string[];
  /** Command letters with numbers masked: two poses blend iff these match. */
  shape: string;
  nums: number[];
}

function tokenize(d: string): Tokens {
  const tokens = d.match(TOKEN) ?? [];
  return {
    tokens,
    shape: tokens.map((t) => (isNumber(t) ? "#" : t)).join(""),
    nums: tokens.filter(isNumber).map(Number),
  };
}

const fmt = round3;

/**
 * `base` is pose 0; `poses` are the others (`at` is their position on the
 * 0..100 scale). Returns amount -> path data.
 */
export function createPoseBlender(
  id: string,
  base: string,
  poses: { at: number; d: string }[],
): (amount: number) => string {
  const stops = [{ at: 0, d: base }, ...poses]
    .sort((a, b) => a.at - b.at)
    .map((p) => ({ at: p.at, ...tokenize(p.d) }));
  const template = stops[0];
  for (const s of stops) {
    if (s.shape !== template.shape) {
      throw new Error(
        `fab: poses of "${id}" have different node structure — duplicate the path (Ctrl+D) and transform the copy instead of editing nodes`,
      );
    }
  }
  const first = stops[0].at;
  const last = stops[stops.length - 1].at;

  return (amount) => {
    const a = Math.min(last, Math.max(first, amount));
    let i = 0;
    while (i < stops.length - 2 && a > stops[i + 1].at) i++;
    const from = stops[i];
    const to = stops[Math.min(i + 1, stops.length - 1)];
    const span = to.at - from.at;
    const t = span === 0 ? 0 : (a - from.at) / span;
    let k = 0;
    return template.tokens
      .map((tok) => {
        if (!isNumber(tok)) return tok;
        const v = from.nums[k] + (to.nums[k] - from.nums[k]) * t;
        k++;
        return fmt(v);
      })
      .join(" ");
  };
}

/**
 * Blend amount (0..100) of a wing beat at progress `u` (0..1): up over the first
 * `upFraction` of the beat, then back down, following 50 * (1 - cos θ). For poses
 * that mirror across a hinge, that is a rigid rotation seen from the side.
 */
export function flapAmount(u: number, upFraction: number): number {
  const theta =
    u < upFraction
      ? Math.PI * (u / upFraction)
      : Math.PI + Math.PI * ((u - upFraction) / (1 - upFraction));
  return 50 * (1 - Math.cos(theta));
}
