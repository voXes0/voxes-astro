import { getCollection, type CollectionEntry } from "astro:content";
import { locales, type Locale } from "@/i18n";
import { blogTopics, type BlogTopic } from "./blogTopics";
import { estimateMinutes, stripMdx } from "@/lib/readingTime";

export { blogTopics, type BlogTopic };

/**
 * Blog posts are MDX files in src/content/blog/<locale>/<slug>.mdx (schema in
 * src/content.config.ts). Titles, descriptions and everything else live in
 * each file's frontmatter; reading time is estimated from the body.
 */

type Entry = CollectionEntry<"blog">;
type Translations = Partial<Record<Locale, Entry>>;

export interface Post {
  slug: string;
  /** The language the shown version is written in. */
  contentLocale: Locale;
  /** True when the requested locale has no version, so the other one is shown. */
  fallback: boolean;
  title: string;
  description: string;
  /** ISO date, YYYY-MM-DD. */
  date: string;
  topic: BlogTopic;
  tags: string[];
  thumbnail?: string;
  /** Estimated reading time in minutes. */
  minutes: number;
  entry: Entry;
}

let bySlug: Promise<Map<string, Translations>> | undefined;

function load() {
  bySlug ??= getCollection("blog").then((entries) => {
    const map = new Map<string, Translations>();
    for (const entry of entries) {
      const [locale, ...rest] = entry.id.split("/");
      if (!locales.includes(locale as Locale) || rest.length === 0) {
        throw new Error(
          `blog: "${entry.id}" must sit at src/content/blog/<locale>/<slug>.mdx`,
        );
      }
      const slug = rest.join("/");
      map.set(slug, { ...map.get(slug), [locale as Locale]: entry });
    }
    return map;
  });
  return bySlug;
}

function toPost(slug: string, translations: Translations, locale: Locale): Post {
  // The requested locale first, then whichever other one exists.
  const contentLocale = [locale, ...locales].find((l) => translations[l])!;
  const entry = translations[contentLocale]!;
  return {
    slug,
    contentLocale,
    fallback: contentLocale !== locale,
    title: entry.data.title,
    description: entry.data.description,
    date: entry.data.date.toISOString().slice(0, 10),
    topic: entry.data.topic,
    tags: entry.data.tags,
    thumbnail: entry.data.thumbnail,
    minutes: estimateMinutes(stripMdx(entry.body ?? ""), contentLocale),
    entry,
  };
}

/** Every post slug, whichever languages it exists in. */
export async function getPostSlugs(): Promise<string[]> {
  return [...(await load()).keys()];
}

/** All posts for the given locale, newest first. */
export async function getPosts(locale: Locale): Promise<Post[]> {
  const map = await load();
  return [...map]
    .map(([slug, translations]) => toPost(slug, translations, locale))
    .sort((a, b) => b.date.localeCompare(a.date));
}

/** One post by slug, or undefined if it doesn't exist. */
export async function getPost(slug: string, locale: Locale): Promise<Post | undefined> {
  const translations = (await load()).get(slug);
  return translations && toPost(slug, translations, locale);
}
