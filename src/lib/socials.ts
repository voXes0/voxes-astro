import { t, type Locale } from "@/i18n";
import { joinCopy } from "./registry";
import { linkedin, github, telegram, instagram, x, discord } from "./links";

/**
 * Social links shown on the Contact page.
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
  /** Brand name. Not translated. */
  label: string;
  href: string;
  /** What's shown beside the link, e.g. "@username". Always LTR. */
  handle: string;
}

export const socials: SocialData[] = [
  {
    id: "linkedin",
    label: "LinkedIn",
    href: `https://${linkedin}`,
    handle: `${linkedin}`,
  },
  {
    id: "github",
    label: "GitHub",
    href: `https://${github}`,
    handle: `${github}`,
  },
  {
    id: "telegram",
    label: "Telegram",
    href: `https://${telegram}`,
    handle: `${telegram}`,
  },
  {
    id: "instagram",
    label: "Instagram",
    href: `https://${instagram}`,
    handle: `${instagram}`,
  },
  {
    id: "x",
    label: "X",
    href: `https://x.com/${x}`,
    handle: `${x}`,
  },
  {
    id: "discord",
    label: "Discord",
    href: `https://${discord}`,
    handle: `${discord}`,
  },
];

export function getSocials(locale: Locale) {
  const copy = t(locale).contact.items;
  return socials.map((social) => joinCopy("contact", "id", social, copy, locale));
}
