import { defaultLocale, locales, type Locale } from "@/i18n";

/**
 * Strips the locale prefix from a pathname, e.g. "/fa/works" -> "/works".
 * The default locale (en) is never prefixed, so "/works" already has
 * nothing to strip and is returned as-is.
 */
export function stripLocale(pathname: string): string {
  const [, maybeLocale, ...rest] = pathname.split("/");
  if (
    maybeLocale !== defaultLocale &&
    locales.includes(maybeLocale as Locale)
  ) {
    return "/" + rest.join("/");
  }
  return pathname;
}

/**
 * Builds an href for an unprefixed path in the given locale, e.g.
 * ("/works", "fa") -> "/fa/works", but ("/works", "en") -> "/works" since
 * the default locale has no prefix.
 */
export function localizedHref(path: string, locale: Locale): string {
  const normalized = path === "/" ? "" : path.replace(/\/$/, "");
  if (locale === defaultLocale) {
    return normalized || "/";
  }
  return `/${locale}${normalized}`;
}

/** Reads the locale prefix off a pathname, e.g. "/fa/works" -> "fa"; unprefixed paths are the default locale. */
export function localeFromPathname(pathname: string): Locale {
  const [, maybeLocale] = pathname.split("/");
  return locales.includes(maybeLocale as Locale) ? (maybeLocale as Locale) : defaultLocale;
}

/** The other supported locale, for the two-locale (en/fa) toggle in the nav. */
export function otherLocale(current: Locale): Locale {
  return locales.find((locale) => locale !== current) ?? defaultLocale;
}
