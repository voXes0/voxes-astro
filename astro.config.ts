import { defineConfig } from "astro/config";
import solidJs from "@astrojs/solid-js";
import sitemap from "@astrojs/sitemap";
import { siteDomain } from "@/lib/links";

export default defineConfig({
  site: `https://${siteDomain}`,

  integrations: [
    solidJs(),
    // The sitemap skips /404 by itself, but not the Persian /fa/404.
    sitemap({ filter: (page) => !/\/404\/?$/.test(page) }),
  ],

  i18n: {
    locales: ["en", "fa"],
    defaultLocale: "en",
    routing: {
      prefixDefaultLocale: false,
    },
  },
});
