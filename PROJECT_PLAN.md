# Voxes — Project Plan for AI Agents

This file exists so that any AI agent (in any conversation, any session) can
pick up work on this repo consistently — same conventions, same visual
vocabulary, same process — without the person having to re-explain context
every time. Read this before making non-trivial changes.

**Status: everything in this document describes an in-progress project.**
Nothing here is permanent by default. Sections are marked below as either
locked-in (safe to build on without asking) or open/exploratory (expect
these to change, and don't treat them as settled).

---

## 0. How to use this document (read this first)

- Before starting non-trivial work, skim this whole file. It's short on
  purpose.
- If the person's request is consistent with this plan, proceed normally.
- If the person says something that **directly contradicts** this plan in a
  way that's clearly deliberate (e.g. "actually, drop the OKLCH palette,
  we're going full black-and-white now" or "no, I don't want that
  component reused, one-off it") — just do it, then update this document
  in the same session to reflect the new decision. Don't ask for
  permission to follow an explicit, unambiguous instruction.
- If the request only **indirectly** conflicts with something here — the
  person didn't mention the plan at all, but doing what they're asking
  would require quietly breaking a documented convention (e.g. they ask
  for a new page and the fastest path would mean inventing a third font
  stack, or duplicating logic that already exists in `src/lib/`) — stop
  and confirm first. Name the specific thing that would change and why,
  then proceed once they say yes, and update this document as part of
  that same change.
- When in doubt about which case you're in, treat it as indirect/unclear
  and confirm. Silent, unconfirmed deviation from this plan is the
  failure mode this document exists to prevent.
- Keep this document itself in sync. A plan that drifts from reality is
  worse than no plan — if you make a decision that isn't reflected here
  yet, write it down before ending your turn.
- Sections marked **(open)** are real unknowns, not oversights — don't fill
  them in with an invented default. Ask the person.

---

## 1. What this project is

Personal site for Taha Haghighi (goes by "Voxes"), showcasing freelance
web development work (Next.js) and personal deep-dive projects (Rust,
systems programming, fluid simulation). Audience is dual: technical
evaluators (potential collaborators, technical hiring contacts) and
non-technical freelance clients. Both audiences need to come away
convinced, via different evidence.

Site is bilingual: English (default, unprefixed routes) and Farsi
(`/fa/*`, RTL). Farsi content throughout the repo is currently
placeholder-quality machine-translated text pending a real pass from the
person — treat any Farsi copy you find as provisional unless told
otherwise.

## 2. Tech stack (locked in — don't swap without an explicit ask)

- **Astro 5**, currently static output (no adapter configured, no
  `output: "server"` set). See §6 for the one known consequence of this.
- **Tailwind CSS v4**, via `@tailwindcss/vite`, imported in
  `src/styles/global.css`. Design tokens (see §4) are defined there as
  CSS custom properties and mapped into Tailwind's `@theme` block — use
  the existing token names (`bg-background`, `text-soft-foreground`,
  etc.) rather than raw color values in new markup.
- **Scoped CSS exception — Works pages.** By explicit instruction, the Works
  page (`WorksPage.astro`) and `WorkDetailPage.astro` are styled with plain
  scoped `<style>` blocks, not Tailwind utilities. They still use the §4 tokens
  via `var(--soft-foreground)` etc., so palette/dark mode stay shared. Existing
  pages (Home, About, Nav, Footer) remain Tailwind. Whether future pages (Blog,
  Contact) follow the CSS or Tailwind approach is not decided — ask. (open)
  Scoped `<style>` in `.astro` files builds fine alongside Tailwind v4; the
  upstream bug (withastro/astro#13144) only affects CSS *Modules*.
  **Router gotcha (fixed):** `src/lib/router.ts` swaps only `#app-content`, so it
  must also copy the incoming page's stylesheets (`syncStyles`). Without that,
  any page using scoped `<style>` rendered unstyled after a client-side
  navigation and only looked right after a refresh. Tailwind pages never showed
  it (utilities are in the global sheet). Keep this in mind if the router is
  ever rewritten.
- **Solid.js** (`@astrojs/solid-js`) for interactive islands (currently
  just `Nav.tsx` — theme toggle, locale toggle, mobile hamburger menu).
  Reach for Solid, not React/Vue, for any future interactive component
  unless there's a specific reason not to.
- **TypeScript**, checked via `astro check` (also runs as part of
  `npm run build`, which is `astro check && astro build` — a type error
  fails the build on purpose).
- `clsx` + `tailwind-merge` via the `cn()` helper in `src/lib/cn.ts` — use
  this for conditional/merged class strings instead of manual template
  literals where reasonable.
- `@astrojs/sitemap` for sitemap generation (reads `site` from
  `astro.config.ts` — see §7, this is currently a placeholder).

## 3. Repo structure

```
src/
  components/
    pages/           — one component per page (HomePage.astro, AboutPage.astro, …)
                        the actual content/layout for each route
    pages/WorkDetailPage.astro — per-project page: renders CaseStudy when a case
                        study exists for the slug, else a minimal stub (see §7)
    CaseStudy.astro   — long-form project layout (hero, sticky contents, brief,
                        process timeline, decisions, challenges, showcase, lessons)
    WorkFigure.astro  — framed figure; renders a placeholder until `src` is set
    WorkMeta.astro    — open/closed-source, status and year tags (Works + detail)
    ButtonLink*.astro — shared button components (Primary/Secondary variants)
    Nav.tsx           — the only interactive (Solid) component so far
    Footer.astro
    icons/            — inline SVG icon components
  i18n/
    case-studies/     — long-form project copy: types.ts (the `CaseStudy` shape),
                        one file per project (kazheh.ts, en+fa), index.ts registry
    index.ts          — locale list, `t(locale)` accessor, `isRtl()`
    messages/en.ts     — English copy + the `Messages` TypeScript interface
    messages/fa.ts     — Farsi copy (implements the same interface)
  layouts/
    BaseLayout.astro   — shell: <head>, fonts, nav, footer, theme init script
  lib/
    cn.ts              — className merge helper
    works.ts            — works registry (structural data) + `getWorks()`/`getWork()`
                           which join it with per-locale copy from i18n
    navigation.ts       — `localizedHref()`, `stripLocale()`, `otherLocale()`
    theme.ts            — Solid signal + cookie/localStorage theme persistence
  pages/
    index.astro, about/index.astro, works/index.astro, blog/index.astro,
    contact/index.astro — English routes, each just imports and renders
                            the matching component from components/pages/
    works/[slug].astro  — one stub detail route per entry in lib/works.ts
    fa/*                — same structure, Farsi routes, prefixed
  styles/
    global.css          — design tokens, Tailwind import, keyframes, fonts
```

**Convention:** a route file under `src/pages/` should stay a thin
wrapper — import the matching `components/pages/*Page.astro` and render it
with the right `locale` prop. Actual layout/content work happens in the
`components/pages/` file, not in the route file. This keeps the `en`/`fa`
route pairs trivially in sync (see §5).

## 4. Design tokens (locked in — the tokens are fixed, compositions built from them are not)

Defined in `src/styles/global.css`, light values in `:root`, dark values
in `.dark` (class-based dark mode, toggled by `src/lib/theme.ts`). All
colors are OKLCH.

| Token | Role |
|---|---|
| `--background` / `bg-background` | page background |
| `--foreground` / `text-foreground` | (rarely used directly — prefer soft-foreground) |
| `--soft-foreground` / `text-soft-foreground` | primary text color |
| `--softer-foreground` / `text-softer-foreground` | secondary/muted text, some accents |
| `--secondary` / `text-secondary`, `bg-secondary` | accent color (green-ish) — links, pills, highlights |
| `--soft-secondary` | secondary accent variant, used in gradients |
| `--low-opacity-*` variants | pre-mixed low-opacity versions of the above, for subtle fills/borders |

Fonts: `--font-latin` (Google Sans Flex Variable) for non-Persian text,
`--font-persian` (Vazirmatn Variable) for Farsi. `BaseLayout` sets
`lang`/`dir` per-locale; Farsi-specific tracking is handled by the
`:lang(fa)` rule in `global.css`.

Keyframes available as Tailwind utilities: `animate-fade`,
`animate-gradient`, `animate-float`. These are the only animations
defined — reuse them before inventing new ones.

**What's locked vs. open:** the token names/values, fonts, and dark-mode
mechanism are stable infrastructure — build on them. The *visual
composition* built from them (blob placement, whether a hero is
photo-led or headline-led, card layouts, timelines vs. strips, etc.) is
explicitly **not** locked site-wide. Different pages are expected to look
somewhat different from each other, each getting its own design pass
using these shared tokens as the palette/type system — see §5 for how
that process actually happened for the About page, as a model to repeat.

**Known dead code:** `HomePage.astro`'s headline uses `stroke-3
stroke-secondary` and a `trail` class on the accent span. Verified against
compiled CSS — `stroke-*` are Tailwind's SVG stroke-width/color utilities
and do nothing on text elements; `trail` isn't defined anywhere in the
codebase. Both are currently no-ops. Don't copy this pattern elsewhere
assuming it produces a visible effect (it doesn't, currently). Flagged
here rather than silently fixed — ask before changing Home's hero, since
its current look, dead classes included, hasn't been explicitly revisited
yet the way About's was.

## 5. Design process for new/redesigned pages

This is the process that produced the About page, and is the expected
process for future page work (Works, Blog, Contact, or any future
redesign of Home) — not a one-off:

1. **Read the actual existing code first** — don't assume a visual effect
   or pattern exists because a class name implies it (see the `stroke-3`
   / `trail` case above — always verify against compiled output, don't
   infer from source alone).
2. **Ask before assuming content/scope.** Don't invent project
   descriptions, achievements, or bio details. If real content isn't
   provided, ask, or explicitly mark placeholders and flag them.
3. **Never present unfinished/unshipped work as finished.** If something
   is in-progress, say so on the page (see the About page's "Work in
   progress" vs "Live" card status pattern) — don't round up.
4. **Prototype layout options as real, verifiable builds before asking
   the person to react to them** — not isolated static HTML mockups with
   guessed styles. The reliable pattern:
   - Build the variant(s) as an actual Astro page/section using real
     site components and tokens.
   - Run `npx astro build`.
   - Programmatically inline **all** `<link rel="stylesheet">` files the
     built page references (there is often more than one — global +
     scoped — grabbing only the first is a real mistake made earlier in
     this project's history, verify by checking that specific known CSS
     rules from each source file actually appear in the final inlined
     output, not just that a `<style>` tag exists).
   - Strip `<script type="module" src="/_astro/...">` tags (hydration
     scripts) since they 404/CORS-fail when the file is opened outside a
     server (`file://`), but are harmless to remove for a static layout
     review.
   - Swap any local image paths that won't resolve standalone (e.g.
     `/images/*.jpg` with nothing uploaded yet) for a placeholder image
     service so the preview isn't a broken-image icon.
   - Verify the output contains real, specific expected content
     (grep for actual strings/class names) before sharing — don't assume
     a script worked; check it.
5. **Get explicit sign-off per section**, not just once for a whole page —
   the About page was built hero-first, then proof cards, then a
   timeline that was later cut down after feedback, in separate rounds.
   Don't batch every decision into one big proposal.
6. **When a person's specific, factual correction reveals earlier copy
   overclaimed or misrepresented something** (e.g. "outgrowing the
   engine" was corrected to "exploring systems languages, chose Rust for
   its safety guarantees") — fix the actual claim to match what they
   said, don't just soften the wording around the same overclaim.
7. **Delete throwaway demo/comparison routes** (e.g. a temporary
   `src/pages/*-demo/` used only to show layout options) once a decision
   is made — they should never ship or linger in the repo.

## 6. Known open issues

- **`Astro.request.headers` / cookie warning on every prerendered page.**
  `BaseLayout.astro` calls `Astro.cookies.get("theme")` to read the theme
  cookie server-side, but the site is fully static (prerendered, no
  `output: "server"`, no adapter) — there's no real per-request cookie at
  build time, so this both warns on every build/dev request and doesn't
  actually do anything useful (the client-side theme script in
  `BaseLayout` already handles theme detection via `localStorage`/
  `matchMedia`). **Decision, deliberately deferred by the person as of
  this writing:** do not fix this yet. Do not silently remove the
  `Astro.cookies.get` call or silently switch output modes to "fix" it
  without being asked — surface it if it becomes relevant to a task, but
  leave it alone otherwise.
- **`public/images/taha-photo.jpg` does not exist yet.** The About page
  hero references this path (see `public/images/README.md` for the
  expected format/sizing). Until a real photo is added, this renders as
  a broken image in a live build — expected, not a bug to silently fix
  with a stock photo.
- **Farsi copy throughout `src/i18n/messages/fa.ts`** (nav, home, and all
  of `about`) is placeholder/machine-translated, explicitly marked with a
  `// TODO` comment in the `about` block. Do not treat it as final. Do
  not extend this pattern to new sections without a similar TODO flag.

## 7. Open decisions (do not assume — ask if relevant to current work)

- **Production domain.** `astro.config.ts` has `site: "https://example.com"`
  with a TODO comment — not the real domain yet. This affects the
  sitemap and absolute hreflang URLs. (open)
- **Hosting/deploy target.** Not decided (Vercel/Netlify/Cloudflare/
  self-hosted/etc). This will determine whether the static-vs-server
  output question in §6 even needs revisiting, and what adapter (if any)
  gets added. (open)
- **Blog implementation.** The Blog nav item and route are real (not
  placeholder in intent) — the person wants a working page to write
  about topics — but *how* posts are authored/stored is not decided
  (Markdown/MDX content collections is the natural Astro-native default,
  but nothing's been chosen). Don't scaffold a content collection or
  posts schema without asking first. (open)
- **Works page: built, with placeholder content.** Layout is a ruled list;
  each row has a pointed-arch image frame (SVG `clipPath`, bounding-box
  units, `#works-arch`), meta tags (open/closed source, status, year), title,
  description, tech chips and optional source/site links. The whole row links
  to `/works/<slug>` via a stretched title link; source/site links are raised
  above it. On phones (<640px) each row is one column: a full-width wide-arch
  banner (`#works-arch-wide`, a second clip shape tuned for wide frames) with
  tags, title, description, tech and links underneath; from 640px it switches to
  portrait arch beside text. (A small-thumbnail-beside-text version was tried and
  rejected: image too small.) The arch is a size container and placeholder art
  scales from `--tile` (a `cqw` length), so every size looks the same. Hover
  effects are `@media (hover: hover)` only (touch gets `:active`). Open/closed filter is pure CSS (radio inputs + `.works:has(...)`)
  so it needs no script and survives the client-side router. Works with no
  `image` render a patterned placeholder with a medallion (rug motif).
  **Every project, description, link, tech list and year is placeholder** —
  replace entries in `src/lib/works.ts` and `works.items` in both message
  files (`getWorks` throws at build time if a locale lacks a slug). Farsi
  copy is TODO-flagged placeholder. Real images: set `image` on the entry.
  (open: real content, real images, final ordering)
- **Per-project pages** (`/works/<slug>`, `/fa/works/<slug>`). Projects with an
  entry in `src/i18n/case-studies/` get the full `CaseStudy` layout; others
  fall back to a minimal stub (title, description, "coming soon") so links
  never 404. To give a project a page: add `<slug>.ts` there (en + fa, same
  `CaseStudy` shape) and register it in `case-studies/index.ts`. Any block with
  a `figure` takes a photo: set `figure.src` (under /public); omit it for the
  framed placeholder. Section headings are per-project (`sections`).
  The contents sidebar is plain anchors, deliberately no scroll-spy script
  (the router doesn't re-run inline scripts).
- **Kazheh page: built, ALL content placeholder** (every sentence, fact and
  caption in `case-studies/kazheh.ts`; Farsi is short, unreviewed placeholder).
  Sections: brief, process (timeline), decisions, challenges, showcase (admin
  panel, booking flow, bilingual layer — example picks only), learnings.
  Real content, which showcase pieces to feature, and real photos are open.
  Other projects' pages are not designed yet. (open)
- **Contact page** is still an empty stub (just renders `BaseLayout` with no
  content) — no design work has happened on it yet. The About page's proof cards currently link to `/works` as a
  generic placeholder destination; once Works has real per-project
  sections, those links should probably become specific deep links
  instead (also flagged inline in `AboutPage.astro`/messages files).
- **Fluid sim (`vofluid`) web integration.** The person has a real,
  demo-ready Rust fluid simulation (SPH) with a public repo, not yet
  compiled for web/WASM. Discussed direction (not yet decided/built):
  a single interactive build (with real controls — particle count,
  viscosity, etc.) on its own page, linked from both Home (lighter/
  decorative embed) and About/Works (as the actual proof-of-skill
  artifact) — rather than building separate decorative and functional
  versions. Do not start WASM integration work without confirming this
  is still the plan, since it hasn't been built yet and priorities may
  have shifted.

## 8. Content/positioning notes (for writing future copy)

These aren't fixed copy — the person may rewrite any of it — but they're
the real, verified facts and positioning decisions established so far,
useful context for writing consistent copy elsewhere on the site:

- Real identity: Taha Haghighi, based in Istanbul. Full name and
  general (city-level) location are fine to state publicly; exact
  address, age, and other personal specifics are not to be added.
- Experience is honestly: ~4 years of self-directed/self-taught study,
  zero years as a traditional employee, one client project to date
  (Kazheh). State this plainly rather than using vague "experienced
  developer" language — specificity reads as more credible to a
  technical audience than an inflated generic claim would.
- Real shipped work: Kazheh, a bilingual Next.js booking site for a
  boutique hotel — the one finished, linkable, real client project.
- Real in-progress work: an SPH fluid simulation engine in Rust, from
  scratch (not a wrapper around an existing library), inspired by
  Clavet's viscoelastic fluid algorithm. Prior attempts were built in
  Unity (vanilla, DOTS, and compute-shader versions) before being
  shelved — the person was exploring systems-level languages generally
  (initially considered C++) and chose Rust specifically for its safety
  guarantees. Demo-ready; multithreading and a compute-shader backend
  are the next steps; has a public repo.
- Genuine personal interests (verified, safe to reference briefly, not
  to over-elaborate): reptile keeping, metal detecting, modding older
  games (e.g. Skyrim internals). Do not pull in other personal-interest
  material from elsewhere unless the person raises it in context — some
  of what's known about the person is deliberately more personal/niche
  than belongs on a public portfolio page, and past About-page drafts
  have intentionally left things out on that basis.
- Positioning thesis, established through iteration, not to be
  flattened back into generic "passionate developer" copy: the person
  is drawn to unsolved/non-off-the-shelf problems and dislikes shipping
  the shallow version of something — this should come through in *how*
  work is described (novel, from-scratch, specific), not as a stated
  "I only want R&D work" preference, which the person explicitly did not
  want (they still do and need practical client work).
