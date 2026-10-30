# Taha "Voxes" Haghighi, Personal Website

The source for [voxes.ir](https://voxes.ir) made with Astro and MDX, for both English and Persian speakers.

## Stack
- Astro, MDX
- CSS Modules

## Getting started
\`\`\`bash
git clone https://github.com/voxes0/voxes-astro
cd voxes-astro
npm install
npm run dev
\`\`\`

## Project structure

English is the default locale and has no URL prefix; Persian lives under `/fa/`.

```
.
├── public/                   Static files served as-is (images, favicons)
├── astro.config.ts
├── tsconfig.json             `@/…` is an alias for `src/…`
└── src/
    ├── pages/                Routes only. Each file is a few lines that render a view
    │   ├── index.astro, about/, blog/, contact/, works/, 404.astro      English
    │   └── fa/               The same tree again for Persian
    ├── components/
    │   ├── views/            Whole-page bodies,
    │   │                     shared by the English and Persian routes via a `locale` prop
    │   ├── mdx/              Components every blog post can use without importing 
    │   ├── icons/            Icon components
    │   └── *.astro, *.tsx    Reusable pieces , each with its own .module.css
    ├── layouts/              BaseLayout: <head>, shell, and the script tags that start the client code
    ├── content/blog/         Posts as MDX: blog/<locale>/<slug>.mdx (schema in content.config.ts)
    ├── data/                 What the site is about: registries and content queries
    │   ├── works.ts          Works, structure only; the text is in i18n/
    │   ├── blog.ts           Reads the blog collection: posts, translations, fallback
    │   ├── blogTopics.ts     The topic list shared by the schema and the UI
    │   ├── socials.ts, links.ts
    │   └── registry.ts       joinCopy(): joins a registry entry to its translated text, fails the build if missing
    ├── i18n/
    │   ├── messages/         en.ts, fa.ts: all interface text
    │   ├── case-studies/     Long-form project pages as typed data. types.ts defines the section kinds
    │   └── index.ts          Locales, t()
    ├── features/             Self-contained client-side features, each loaded lazily
    │   ├── fabricator/       The animated illustration
    │   ├── flappy/           The FlappyBird mini-game 
    │   └── gallery/          Image slider and fullscreen viewer
    ├── client/               Browser runtime shared by the whole site
    │   ├── router.ts         Client-side navigation
    │   ├── progress.ts       Loading bar used by the router
    │   ├── theme.ts          Light/dark state
    │   └── mountOnNavigate.ts  Runs a feature's mount code after load and after every navigation
    ├── lib/                  Small pure helpers
    ├── styles/global.css     Tokens and global styles
    ├── content.config.ts     Collection schemas
    └── env.d.ts
```

### How the pieces fit

- **Pages are thin.** `pages/works/[slug].astro` and `pages/fa/works/[slug].astro` both render
  `components/views/WorkDetailPage.astro` with a different `locale`. The page's real markup and styles live in `views/`.
- **Features have the same shape.** Each folder in `features/` has an `entry.ts` that `BaseLayout` includes once.
  The entry finds its elements on the page (`#fab-stage`, `[data-flappy]`, `[data-gallery]`), and only then
  imports the heavy code, so pages without the feature download none of it. The matching Astro component
  (`Fabricator.astro`, `FlappyBird.astro`, `mdx/Figure.astro`) renders the markup.
- **Works are split on purpose.** Structure (kind, status, tech, links) is in `data/works.ts`; text is in
  `i18n/messages/<locale>.ts`; a long-form page is in `i18n/case-studies/`. `joinCopy` fails the build if a
  locale is missing an entry.

## License
Code is licensed under the [MIT License](./LICENSE).
Content (text, images, CV) is ©Voxes and
not licensed for reuse without permission.
