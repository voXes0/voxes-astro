import { t, type Locale } from "@/i18n";
import { joinCopy } from "./registry";

/**
 * Social links shown on the Contact page. Structural facts (name, url, the
 * handle as displayed) live here and are the same in every locale; the
 * translatable one-line description lives in the i18n message files under
 * `contact.items`, joined by `id`. `getSocials` throws at build time if a
 * locale is missing one, same idea as `getWorks`.
 *
 * Order here is the display order.
 *
 * TODO: every href and handle below is a placeholder.
 */

export type SocialIconName =
  | "linkedin"
  | "github"
  | "telegram"
  | "instagram"
  | "x"
  | "discord";

export interface SocialData {
  id: SocialIconName;
  /** Brand name. Not translated: brands keep their Latin spelling. */
  label: string;
  href: string;
  /** What's shown beside the link, e.g. "@username". Always LTR. */
  handle: string;
}

export const socials: SocialData[] = [
  {
    id: "linkedin",
    label: "LinkedIn",
    href: "https://www.linkedin.com/in/username",
    handle: "linkedin.com/in/username",
  },
  {
    id: "github",
    label: "GitHub",
    href: "https://github.com/username",
    handle: "github.com/username",
  },
  {
    id: "telegram",
    label: "Telegram",
    href: "https://t.me/username",
    handle: "@username",
  },
  {
    id: "instagram",
    label: "Instagram",
    href: "https://www.instagram.com/username",
    handle: "@username",
  },
  {
    id: "x",
    label: "X",
    href: "https://x.com/username",
    handle: "@username",
  },
  {
    id: "discord",
    label: "Discord",
    // Real Discord profile links need a numeric user ID, not the username.
    href: "https://discord.com/users/000000000000000000",
    handle: "username",
  },
];

export function getSocials(locale: Locale) {
  const copy = t(locale).contact.items;
  return socials.map((social) => joinCopy("contact", "id", social, copy, locale));
}
