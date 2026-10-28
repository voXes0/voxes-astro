import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import solidJs from "@astrojs/solid-js";
import sitemap from "@astrojs/sitemap";
import { siteDomain } from "@/lib/links";

export default defineConfig({
  site: `https://${siteDomain}`,

  integrations: [
    solidJs(),
    mdx(),
    // The sitemap skips /404 by itself, but not the Persian /fa/404.
    sitemap({ filter: (page) => !/\/404\/?$/.test(page) }),
  ],

  // Code blocks carry both themes as CSS variables; Prose.module.css picks one
  // from the site's light/dark class.
  markdown: {
    shikiConfig: {
      themes: { light: "github-light", dark: "github-dark" },
      defaultColor: false,
    },
  },

  i18n: {
    locales: ["en", "fa"],
    defaultLocale: "en",
    routing: {
      prefixDefaultLocale: false,
    },
  },
});
