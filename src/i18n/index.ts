import en from "./messages/en";
import fa from "./messages/fa";
import type { Messages } from "./messages/en";

export const locales = ["en", "fa"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "en";
export const rtlLocales: readonly Locale[] = ["fa"];

const messages = { en, fa } satisfies Record<Locale, Messages>;

export function isRtl(locale: Locale): boolean {
  return rtlLocales.includes(locale);
}

/** Returns the message dictionary for a locale, e.g. `t(locale).nav.home`. */
export function t(locale: Locale) {
  return messages[locale];
}
