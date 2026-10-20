import { t, type Locale } from "@/i18n";
import { joinCopy } from "./registry";

/**
 * Blog registry. Structural facts live here (date, reading time, topic,
 * tags); translatable copy (title, description) lives in the i18n message
 * files under `blog.items`, joined by `slug`. Adding a post means one entry
 * here plus one entry per locale there — `getPosts` throws at build time if
 * a locale is missing one.
 *
 * TODO: every entry below is placeholder content.
 */

export type BlogTopic = "algorithm" | "framework" | "comparison" | "notes";

export const blogTopics: BlogTopic[] = [
  "algorithm",
  "framework",
  "comparison",
  "notes",
];

export interface PostData {
  slug: string;
  topic: BlogTopic;
  /** ISO date, YYYY-MM-DD. */
  date: string;
  /** Estimated reading time in minutes (aim for 5–15). */
  minutes: number;
  /** Proper nouns / tech names; not translated. */
  tags: string[];
  /** Optional thumbnail (public path). Posts without one render text-only. */
  thumbnail?: string;
}

export const posts: PostData[] = [
  {
    slug: "sph-from-scratch",
    topic: "algorithm",
    date: "2026-09-28",
    minutes: 14,
    tags: ["SPH", "Rust", "Simulation"],
    thumbnail: "/images/blog/sph-from-scratch.svg",
  },
  {
    slug: "astro-vs-next",
    topic: "comparison",
    date: "2026-09-11",
    minutes: 9,
    tags: ["Astro", "Next.js"],
    thumbnail: "/images/blog/astro-vs-next.svg",
  },
  {
    slug: "a-star-heuristics",
    topic: "algorithm",
    date: "2026-08-19",
    minutes: 11,
    tags: ["A*", "Pathfinding"],
  },
  {
    slug: "css-has-selector",
    topic: "framework",
    date: "2026-07-30",
    minutes: 6,
    tags: ["CSS"],
  },
  {
    slug: "wasm-or-not",
    topic: "comparison",
    date: "2026-06-14",
    minutes: 12,
    tags: ["Rust", "WASM", "Performance"],
    thumbnail: "/images/blog/wasm-or-not.svg",
  },
  {
    slug: "why-i-write-here",
    topic: "notes",
    date: "2026-05-02",
    minutes: 5,
    tags: ["Writing"],
  },
];

export interface Post extends PostData {
  title: string;
  description: string;
}

/** All posts with copy for the given locale, newest first. */
export function getPosts(locale: Locale): Post[] {
  return [...posts]
    .sort((a, b) => b.date.localeCompare(a.date))
    .map((data) => joinCopy("blog", "slug", data, t(locale).blog.items, locale));
}
