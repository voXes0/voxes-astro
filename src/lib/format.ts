import type { Locale } from "@/i18n";

/**
 * Date, number and reading-time formatting for the blog. fa-IR gives Persian
 * digits and the Solar Hijri calendar; en-US stays Gregorian.
 */
export function postFormatters(locale: Locale, readTime: string) {
  const intlLocale = locale === "fa" ? "fa-IR" : "en-US";
  const dateFmt = new Intl.DateTimeFormat(intlLocale, {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
  const numFmt = new Intl.NumberFormat(intlLocale);
  return {
    fmtDate: (iso: string) => dateFmt.format(new Date(`${iso}T00:00:00Z`)),
    fmtNum: (n: number) => numFmt.format(n),
    fmtRead: (n: number) => readTime.replace("{n}", numFmt.format(n)),
  };
}
