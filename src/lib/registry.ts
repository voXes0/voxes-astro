import type { Locale } from "@/i18n";

/**
 * Joins one structural registry entry to its translated copy by `key`
 * (`slug` or `id`). Throws at build time when the locale has no matching
 * copy, so registries and message files can't silently drift apart.
 */
export function joinCopy<K extends string, D extends Record<K, string>, C extends Record<K, string>>(
  registry: string,
  key: K,
  data: D,
  copies: readonly C[],
  locale: Locale,
): D & C {
  const copy = copies.find((item) => item[key] === data[key]);
  if (!copy) {
    throw new Error(
      `${registry}: missing "${locale}" copy for ${key} "${data[key]}" in src/i18n/messages/${locale}.ts`,
    );
  }
  return { ...data, ...copy };
}
