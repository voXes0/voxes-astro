# Voxes — Astro + Solid

This is a port of the original Next.js (App Router) + React site to
[Astro](https://astro.build) with [Solid](https://www.solidjs.com) for the
interactive pieces. The goal was idiomatic Astro/Solid, not a literal
line-for-line translation — see "What changed and why" below.

## Stack

- **Astro**, fully static (`astro build` outputs plain HTML/CSS/JS — deploy
  the `dist/` folder anywhere: a CDN, GitHub Pages, S3, any static host)
- **Solid** only where the page actually needs client-side interactivity:
  the nav (mobile menu, theme toggle, locale switch) and the animated icons
  it uses
- **Tailwind v4** (via the official Vite plugin) — the design tokens and
  utility classes are unchanged from the original
- **@astrojs/sitemap** — generates `sitemap-index.xml` at build time listing
  every locale's pages

## Before deploying

Set the real production domain in `astro.config.ts` (`site: "..."`) —
it's currently a placeholder. This value is what the sitemap and the
`hreflang`/canonical `<link>` tags use to build absolute URLs, so it has to
be correct for those to be worth anything to search engines.

## Running it

```bash
npm install
npm run dev       # http://localhost:4321
npm run build     # type-checks, then builds to dist/
npm run preview   # serve the production build locally
```

## Project structure

```
src/
  pages/
    index.astro       # English — unprefixed, e.g. /works, /about
    about/, blog/, contact/, works/
    fa/                # Farsi — prefixed, e.g. /fa/works, /fa/about
      index.astro, about/, blog/, contact/, works/
  components/
    pages/            # actual page content, shared between en and fa routes
    icons/            # Logo, Hamburger, ThemeToggle, Localization
    Nav.tsx           # the only "island" — everything else is .astro
    Fabricator.astro  # markup-only stage for the laser-fabrication animation
    Footer.astro
    ButtonLink*.astro
  layouts/
    BaseLayout.astro  # <html>, fonts, anti-FOUC script, hreflang, Nav + Footer
  i18n/
    messages/         # en.ts / fa.ts — same shape as the old next-intl files
    index.ts          # tiny typed dictionary helper (no next-intl)
  fab/                # the fabricator (see below)
    pieces/           # one file per drawing: tv.ts, (bird.ts, drop.ts, ...)
  lib/
    theme.ts          # Solid signal-based theme store (replaces next-themes)
    navigation.ts      # locale-aware href helpers (en unprefixed, fa prefixed)
    cn.ts
  styles/global.css
```

## What changed and why

**Routing & i18n.** Next's `app/[locale]/...` + `next-intl` middleware is
replaced by Astro's _built-in_ i18n routing (`i18n.routing.prefixDefaultLocale:
true` in `astro.config.ts`), which already does locale-prefixed routing,
so there's no need for a routing library. `next-intl`'s `useTranslations`/
`getTranslations` are replaced by a plain typed object lookup in
`src/i18n/index.ts` — translation calls read `t(locale).home.title1` instead
of `useTranslations('Home')`. `fa.ts` uses `satisfies typeof en` so a
missing key is a build-time type error instead of a silent runtime fallback.

**Rendering mode.** The original had a `proxy.ts` (Next middleware) that
inspects the request's cookie, `accept-language` header, and geo header on
_every request_ to pick a locale for the bare `/`. Astro's own middleware
only runs at _build time_ for statically prerendered pages — it does not
see real request headers unless the site is server-rendered on demand. So
this project uses `output: "server"` with the Node adapter rather than
Astro's default static output; `src/middleware.ts` ports the original
detection logic almost line for line.

**Theme.** `next-themes` is React-specific, so it's replaced with ~30 lines
in `src/lib/theme.ts`: a module-level Solid signal, synced to a `class`
on `<html>` and a `theme` cookie, seeded by the same inline anti-FOUC
`<script>` the original used. The layout reads the `theme` cookie
server-side (`Astro.cookies`) and passes it to `Nav` as `serverIsDark` so
the very first server-rendered paint already has the right icon, rather
than flashing and correcting after hydration.

**Interactivity boundary.** Only `Nav` is a Solid island
(`client:load`, since it must be interactive immediately). `Footer`,
the buttons, and every page body are `.astro` components — they render to
plain HTML with no client-side JavaScript at all, which is strictly less
JS shipped than the Next version (where these were React server components
that still depended on the client React runtime already on the page).

**Icons.** `useState`/`useEffect`/refs become Solid's `createSignal`/
`createEffect`/`onCleanup` and refs. SVG attributes are written in native
kebab-case (`stroke-width`, `clip-path`, `class`) rather than React's
camelCase (`strokeWidth`, `clipPath`, `className`) — that's just how Solid's
JSX works, it stays close to the DOM. `LocalizationIcon` is a Solid
component (not `.astro`) purely because it's used inside the `Nav` island;
an `.astro` component can't be embedded inside Solid JSX.

**Fonts.** `next/font/google` doesn't exist outside Next, so both fonts are
self-hosted via Fontsource (`@fontsource/google-sans-flex`,
`@fontsource-variable/vazirmatn`), imported once in `global.css`.

**Navigation.** `next-intl`'s `<Link>`/`useRouter` are replaced by plain
`<a href>` tags built from `localizedHref()` — Astro is a multi-page app by
default (full navigations between routes), so there's no client router to
integrate with, and none is needed here.

**Bug not preserved:** the original `blog/page.tsx` and `contact/page.tsx`
had no `return` statement (`{ <>...</> }` instead of `{ return <>...</> }`),
so they rendered nothing. The ported `BlogPage.astro` / `ContactPage.astro`
render a valid (empty-content) page instead of reproducing that bug.

## The fabricator (`src/fab/`)

The animated stage on the home page, split by concern:

- `pieces/*.ts` — what gets drawn: stroke data (+ an optional `act` for what
  moves once it is drawn). `pieces/index.ts` is the play queue.
- `engine.ts` — draw / fill mechanics for one piece (crisp fill layer + glowing outline per stroke). Knows no pieces.
- `sequencer.ts` — plays the queue: build → act → extra hold → transition → next (the laser head carries over).
- `transitions.ts` — how a finished piece leaves: `collapse` (CRT switch-off into the laser dot), `fade`, or `flyout` (accelerates out of the component to the right; the bird uses it). Default is `CONFIG.transition` in `config.ts` (which also holds every timing); a piece overrides it with `transition: "flyout"`.
- `scene.ts`, `acts.ts` — the toolbox an `act` uses (animate, overlays,
  reusable behaviours like `flap`, `flapPoses`, `lookAround`, `tuckLegs`). Anything an act creates or reshapes is undone for it. `scene.spawn(task)` starts something that keeps going on its own (the bird's wings flap until it has left) and is stopped when the piece is torn down.
- `scripts/svg-to-piece.mjs` (`pnpm fab:import art/bird.svg`) — turns an Inkscape SVG into
  `pieces/<id>.strokes.ts` (generated; the regenerate command is in its header) and a hand-written
  `pieces/<id>.ts` stub (never overwritten). Supports `--order`, `--flag`, pivots and
  multi-pose strokes (`wing-0` + `wing-100`); see the script's header comment.
- `pose.ts` — blends a stroke between its poses; `acts.ts` has `flap` (rigid rotation about a
  pivot) and `flapPoses` (pose-to-pose flap). `art/` holds the source SVGs.
- `autoMount.ts` — loaded by `BaseLayout`; (re)mounts on page load and on the
  router's `app:navigated`, because the custom router doesn't run page scripts.

The stage exposes `data-fab-piece` / `data-fab-state` (`building | acting | transitioning | static`) for tests.
