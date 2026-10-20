/** Joins class names, skipping falsy values (`cond && styles.x`). */
export function cx(...names: (string | false | null | undefined)[]): string {
  return names.filter(Boolean).join(" ");
}
