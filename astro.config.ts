import { defineConfig } from "astro/config";
import solidJs from "@astrojs/solid-js";
import sitemap from "@astrojs/sitemap";

export default defineConfig({
  // TODO: replace with the real production domain — required for the sitemap
  // and for absolute hreflang URLs to be correct.
  site: "https://example.com",

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
