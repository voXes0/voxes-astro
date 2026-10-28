import type { Locale } from "@/i18n";

const WORDS_PER_MINUTE: Record<Locale, number> = { en: 200, fa: 180 };

/** Keys holding ids, paths or layout hints rather than text a visitor reads. */
const NON_PROSE_KEYS = new Set([
  "id",
  "kind",
  "src",
  "width",
  "height",
  "ratio",
  "alt",
]);

/** Every readable string inside `value` (nested objects and arrays), space-joined. */
export function collectText(value: unknown): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(collectText).join(" ");
  if (value && typeof value === "object") {
    return Object.entries(value)
      .filter(([key]) => !NON_PROSE_KEYS.has(key))
      .map(([, v]) => collectText(v))
      .join(" ");
  }
  return "";
}

/** Whole minutes (at least 1) to read all the text in `content`. */
export function estimateMinutes(content: unknown, locale: Locale): number {
  const segmenter = new Intl.Segmenter(locale, { granularity: "word" });
  let words = 0;
  for (const part of segmenter.segment(collectText(content))) {
    if (part.isWordLike) words++;
  }
  return Math.max(1, Math.ceil(words / WORDS_PER_MINUTE[locale]));
}

/** The readable text of an MDX/Markdown source: no imports, tags, link targets or code fences. */
export function stripMdx(source: string): string {
  return source
    .replace(/^import .*$/gm, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\]\([^)]*\)/g, "]")
    .replace(/^```.*$/gm, "");
}
