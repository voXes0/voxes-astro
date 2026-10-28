import { t, type Locale } from "@/i18n";
import { getCaseStudy } from "@/i18n/case-studies";
import { joinCopy } from "./registry";
import { estimateMinutes } from "./readingTime";

/**
 * Works registry. Structural facts live here (kind, status, tech, links,
 * image); translatable copy (title, description) lives in the i18n message
 * files under `works.items`, joined by `slug`. Adding a work means one entry
 * here plus one entry per locale there — `getWorks` throws at build time if a
 * locale is missing one, so the two can't silently drift apart.
 *
 * TODO: every entry below is placeholder content.
 */

export type WorkKind = "open" | "closed";
export type WorkStatus = "live" | "wip" | "archived";

export interface WorkImage {
  /** Path under /public, e.g. "/images/works/kazheh.avif". */
  src: string;
  width: number;
  height: number;
}

export interface WorkData {
  slug: string;
  kind: WorkKind;
  status: WorkStatus;
  /** ISO date, YYYY-MM-DD. */
  date: string;
  tech: string[];
  /** Public source repository. Only meaningful for open-source work. */
  repo?: string;
  /** Live site / demo. */
  site?: string;
  /** Omit to render the patterned placeholder artwork. */
  image?: WorkImage;
  /** Which placeholder pattern to use when there's no image (1–3). */
  pattern: 1 | 2 | 3;
}

export const works: WorkData[] = [
  {
    slug: "kazheh",
    image: {
      src:"/images/kazheh/mockup.png",
      width: 720,
      height: 450,
    },
    kind: "closed",
    status: "live",
    date: "2026",
    tech: ["Next.js", "React", "PostgreSQL","i18n"],
    site: "https://kazhehhouse.ir",
    pattern: 1,
  },
  {
    slug: "vofluid",
    kind: "open",
    status: "wip",
    date: "2026-03-01",
    tech: ["Rust", "SPH", "WASM"],
    repo: "https://github.com/example/vofluid",
    pattern: 2,
  },
  {
    slug: "voxes",
    kind: "open",
    status: "live",
    date: "2026-09-01",
    tech: ["Astro", "Solid.js", "CSS", "TypeScript"],
    repo: "https://github.com/example/voxes",
    site: "https://example.com",
    pattern: 3,
  },
];

export interface Work extends WorkData {
  title: string;
  description: string;
  /** Reading time of the work's case study; undefined while it has none. */
  minutes?: number;
}

function join(data: WorkData, locale: Locale): Work {
  const copy = joinCopy("works", "slug", data, t(locale).works.items, locale);
  const study = getCaseStudy(data.slug, locale);
  return study ? { ...copy, minutes: estimateMinutes(study, locale) } : copy;
}

/** All works with copy for the given locale, in display order. */
export function getWorks(locale: Locale): Work[] {
  return works.map((data) => join(data, locale));
}

/** One work by slug, or undefined if it doesn't exist. */
export function getWork(slug: string, locale: Locale): Work | undefined {
  const data = works.find((w) => w.slug === slug);
  return data ? join(data, locale) : undefined;
}
