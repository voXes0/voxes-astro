import type { Locale } from "@/i18n";
import type { CaseStudy } from "./types";
import kazheh from "./kazheh";

export type { CaseStudy, CaseFigure, CaseSection } from "./types";

/** slug -> per-locale case study. Add a project's page by adding it here. */
const studies: Record<string, Record<Locale, CaseStudy>> = {
  kazheh,
};

/** The case study for a work, or undefined (the page then falls back to the stub). */
export function getCaseStudy(
  slug: string,
  locale: Locale,
): CaseStudy | undefined {
  return studies[slug]?.[locale];
}
