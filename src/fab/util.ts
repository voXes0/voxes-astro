export const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));
export const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
/** Smoothstep: 0 → 1 with zero slope at both ends. */
export const smooth = (x: number) => x * x * (3 - 2 * x);
/** At most 3 decimals, without trailing zeros: keeps generated path data short. */
export const round3 = (n: number) => String(Math.round(n * 1000) / 1000);
/** One command letter or one number of SVG path data. */
export const PATH_TOKEN = /[a-zA-Z]|[-+]?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/gi;
