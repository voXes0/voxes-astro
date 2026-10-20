# Turning an SVG into a fabricator draw sequence

This document is for an AI agent picking up work on the "laser fabrication"
component in a future session. The fabricator now lives in `src/fab/`
(engine, sequencer, scene API, one file per piece) with markup in
`src/components/Fabricator.astro` — see the README. The old `HomePageI.astro` /
`/home-i` preview no longer exists; the TV is `src/fab/pieces/tv.ts`.
It explains how to take an SVG the person sends (drawn in Inkscape or
elsewhere) and turn it into a sequence the fabricator can draw, fill, and
the same process used to build the TV-logo sequence already in that
file. Read the actual component before starting; this doc explains the
process, not the full mechanism (draw/fill timing, the head marker,
the glow filter, etc. — go read the code, it's commented).

**Read this whole document before writing any code.** Several steps here
exist specifically because skipping them produced real, shipped bugs earlier
in this project's history — the notes explaining *why* are not optional
context, they are the difference between working output and a subtle,
hard-to-spot mistake (wrong direction, wrong scale, wrong center).

---

## Fast path: use the importer

`pnpm fab:import art/<name>.svg [--id name] [--size 220]` does §1-§4 below for you:
reads real path data, applies layer/group transforms, converts circles/rects to paths,
computes the `fit` (no manual bbox step) and writes `src/fab/pieces/<id>.strokes.ts`
(generated, safe to regenerate) plus a `<id>.ts` stub for the hand-written `act`.
Conventions are set in Inkscape (object label, or the object id when there is no label):
document order (or `NN-` prefix) = draw order; flags after the name: `fill` / `nofill` /
`bg` (background fill) / `solid` (solid draw-color fill); a circle named `pivot` or
`pivot-shoulder-l` is a marker for acts and is never drawn; `wing-0` + `wing-100` are two
poses of ONE stroke `wing` (the second made by Ctrl+D + transform, never by editing nodes).
When the file uses ids instead of labels, pass the same things on the command line:
`--order "body,eye,pupil,leg|feet,tail,wing" --flag eye=bg --flag pupil=solid`.
The exact command is written into the header of the generated `<id>.strokes.ts`, so
regenerating after a redraw is copy-paste. Then add the piece to `pieces/index.ts`.
A stroke with poses is animated with `flapPoses(scene, "wing")` (acts.ts): a blend of
50 * (1 - cos θ) between the poses, which for two mirror-image poses is exactly a rigid
flip about the hinge (edge-on at 50). See `src/fab/pieces/bird.ts`.
Sections 1-4 remain as the reference for what the script does and why. Still do §6.

## The flower — FINISHED. Do not read or change it when building the scene.

`src/fab/pieces/flower.ts` (with `src/fab/morph.ts`) is a self-contained, tested component:
the budded flower, its laser drawing, the unfurl and the fold back. A conversation building
the whole scene only has to USE it; it never needs to open those two files.

**What the scene needs to do**
1. Do not import the flower's paths from `art/scene.svg`. They are `path1, 2, 4, 7, 14, 15, 16,
   17, 18, 19, 20, 22, 23` (all at the top level, unnamed). The scene importer must skip them
   (or the user deletes them from the scene file after the final `pnpm fab:flower`).
2. Add the flower to the chapter where the hill is drawn:
   `import { flowerStrokes, flowerDrawOrder, unfurlFlower, foldFlower, flowerBounds } from "./pieces/flower"`.
   - `flowerStrokes`: ids all start with `flower-`; array order = STACKING order (later = in front).
     Coordinates are those of `art/scene.svg` (no transform), the same world as the rest of the scene.
   - `flowerDrawOrder`: the order the laser draws the visible bud (`Piece.drawOrder`). The
     sequencer's draw loop must support `drawOrder`, `FabStroke.draw`, `FabStroke.hidden` and
     `Piece.headOnTop` (all exist; keep them when chapters replace the sequencer).
   - Keep the laser head painted above the strokes (`headOnTop`): the petals have opaque fills.
3. Trigger from the cloud's act: `await unfurlFlower(scene)` (about 3.4 s). Between loops:
   `await foldFlower(scene)` returns it to exactly the drawn bud (safe to unfurl again after).
   Both are in the flower's own coordinates; nothing needs positioning.
4. `flowerBounds` = bounding box (x, y, width, height) of bud + open flower, for camera
   keyframes. The bud sits above the stem top at about (165.3, 6.4); the open flower spreads
   about 10 units left and 8 right of it.

**Engine features it relies on (all in `src/fab`, documented in `types.ts`):** `FabStroke.draw`
(laser draws only part of an outline), `FabStroke.hidden` + `scene.show/hide` (finished but
invisible until shown), `Piece.drawOrder` (draw order differs from stacking), `Piece.headOnTop`,
`scene.limit`, and `matchShapes` in `morph.ts` (blends two outlines with different nodes).

**How it works, in short:** every petal body is filled with the page background, so what is in
front hides what is behind. Petals 4 and 5 and the center are never drawn: they sit inside the
bud, covered by petals 1-3, and show as those open. The center starts tucked inside the bud
(computed from the real shapes) and grows to its drawn size; a copy fades in on top at the end.

**Changing the art (the user can do this alone, no AI needed)**
Edit the petal paths in Inkscape (`art/scene.svg`), keep their ids, save, run `pnpm fab:flower`
(rewrites only the path data block in `flower.ts`; prints which paths changed). Then look at it.
- Free to change: any petal's open shape OR its bud shape, the center, in any way: move,
  reshape, rotate, scale, add or delete nodes (shapes need no matching node structure).
- Keep, or the morph twists or shows something it should not:
  - each petal's BASE (where it meets the others) near (165.33, 6.43); if the base moves
    further than ~0.3 units, change `BASE` in `flower.ts`;
  - each petal's TIP stays the point farthest from its base, in the bud shape and the open one;
  - each petal stays on its side (left edge stays the left edge): do not flip a petal over;
  - outlines closed (end where they start) and not crossing themselves;
  - the bud: petals 4 and 5 (`path22`, `path23`) stay inside what petals 1-3 cover, else a
    sliver shows before they open (petal 5 currently pokes out 0.07 units, under a line width);
    petal 1's, 2's and 3's visible edges are what the laser draws.
- Where petals overlap when open, the one later in the stacking order (5, 4, 3, 2, 1) is in
  front. Different overlap = reorder `flowerStrokes` (ask for it; do not do it blind).
- Timing: the `UNFURL` table at the top of the act code in `flower.ts` (start and duration per petal).

## The scene: chapters and the camera

`src/fab/pieces/scene.ts` is chapter 1 (bird -> flower -> sun), played by `mountChapters` in
`src/fab/director.ts`. A chapter has a world (the drawing's own coordinates), a camera
(`camera.ts`, pans only; `view` = world units across the stage) and a script `run(d)`:
`d.add(piece)` returns an Actor with `build(from)` (laser draws it: `drawOrder`, `draw`, `hidden`,
`headOnTop` all work), `place()` (already there), `scene` (the usual act toolbox) and `remove()`.
Pieces are placed in the world by their `fit` (translate + scale only).

- Geometry comes from `art/scene-1.svg` via `pnpm fab:scene` (writes `scene.strokes.ts`; group
  transforms are baked in). It never reads the flower's paths; it only measures `path4` to place the flower.
- Bird flight: `flight.ts` (follows `bird-rough-fly-path` roughly; shrinks with x). Camera chase and halt
  are in `scene.ts` (`HALT` is the final framing; the sun sits top-left of it).
- Sun: `pieces/sun.ts` (`igniteSun`). Same palette as the rest of the scene (bloom gradient: `#fab-sun-bloom` in `Fabricator.astro`).
- New optional fields: `Piece.line`, `Piece.color`, `Piece.extent`, `FabStroke.line`, `FabStroke.outline`.
  Glow filters are now created per piece by the engine (no shared `#fab-glow-piece`).
- To loop the chapter, set `repeatAfterMs` and call `foldFlower(scene)` at the end of `run`.

## 0. What you're actually building

The fabricator plays one continuous cycle:

1. Draw each stroke in order (outline animates in via `stroke-dashoffset`,
   a glowing head marker rides the tip).
2. Any stroke marked `fill: true` fades its fill in right after its own
   outline finishes.
3. The piece's `act` plays (or a short hold if it has none) — e.g. the VOXES
   wordmark pop in the TV sequence, or the bird looking around, tucking its
   legs and flapping — then everything stays up `CONFIG.actExtraMs` longer.
4. The piece leaves through a transition (`src/fab/transitions.ts`, chosen by
   `CONFIG.transition`): `collapse` squashes it to a line and then a dot that
   becomes the laser head, `fade` cross-fades, `flyout` sends it flying out of the
   component (a piece can pick its own with `Piece.transition`; anything started
   with `scene.spawn`, like flapping wings, keeps running through it). The head carries over into the
   next piece's first stroke. (There is no erase pass any more.)
5. Loop.

Your job for a new piece is: get real path data, order it sensibly,
classify each path as filled or outline-only, work out the piece's `fit`, and
add a `Piece` file in `src/fab/pieces/` plus one line in `pieces/index.ts`.
The engine (`engine.ts`), sequencer and head do not change for a new piece.

## 1. Getting real path data out of an SVG the person sends

- The person draws in Inkscape and sends you an `.svg` file (uploaded, or
  pasted as text). **Always work from the file they send** — do not
  hand-trace or approximate a shape from a description or a screenshot.
  Open the actual file and read the actual `<path d="...">` strings.
- Prefer **stroke-based, individual paths** over one mega-path or a
  filled-only shape with no stroke. If the person's SVG only has fills and
  no strokes, that's fine — you can still animate the fill-region's own
  outline via `stroke-dasharray`/`stroke-dashoffset` (that's exactly what
  the TV's body/frame/screen paths are: filled shapes, dash-animated by
  their own outline). What matters is that each piece you want to animate
  independently is its own `<path>` element with real, extractable `d` data.
- If the person's Inkscape file has **layers or object labels**
  (Objects panel / XML editor), use those names to identify which path is
  which and in what order they asked for construction — don't guess from
  visual inspection alone if labels are available.
- **Ask the person which stroke(s) should carry an idle "payoff" animation**
  once drawn (e.g. a wing that flaps, a bow that slides) if it's not
  already obvious or stated. Don't invent this — confirm it, the same way
  content/scope is confirmed per §5.2 of `PROJECT_PLAN.md`.

## 2. Deciding stroke order

Order in the array is literally the order the laser draws in. Pick an order
that would make sense as a real construction sequence — outer/structural
elements before small details is usually right (see the TV: antennae →
body → screen frame → screen), but defer to how the person describes it if
they have a specific sequence in mind. If unsure, ask rather than guess —
this is a creative/content decision, not a technical one.

## 3. Classifying each path: outline-only vs filled

For each path, decide:

- **Outline-only** (`fill` omitted/false): open strokes with no meaningful
  interior — a line, a rod, a squiggle. These draw as pure line
  strokes.
- **Filled** (`fill: true`): closed shapes that are genuinely filled in
  the source art — a body, a knob, a leaf, a wing panel. These get an
  additional `fillIn` step layered onto the same draw. (The fill is its own crisp path
  under the outline; only the outline glows.)
- **Filled with an override color** (`fill: true, fillColor: "..."`): use
  this when a shape's fill should NOT be the accent color — e.g. the TV
  screen fills with `var(--background)` rather than `currentColor`, because
  in the real logo the screen reads as a lighter "glass" surface against
  the frame, not another accent-colored shape. Ask yourself the same
  question for any new piece: does this shape read as "filled with the
  brand accent" or "filled with something else (background, a specific
  token, etc.)"? Don't default every fill to the accent color without
  checking against the source art.
- When a shape uses `fillColor`, its `fillIn` target opacity should
  generally be `1` (fully opaque — it's meant to read as a real surface,
  like glass or a background cutout), whereas accent-colored fills
  currently use a lower target opacity (`0.35` in the existing code) so
  they read as a translucent glow layer rather than a flat block. Match
  this pattern unless the source art clearly wants a solid accent fill.

## 4. Getting the scale and position right — measure, don't guess

Do not estimate a bounding box from path coordinates (relative commands and
arcs make that unreliable). Measure it for real:

1. Render just the new path(s) at their source coordinates in a throwaway HTML
   file and call `getBBox()` with Playwright (or use a bbox library that
   handles arcs). That gives the true `{x, y, width, height}` in source space.
2. Compute the piece's `fit`, which maps source space onto the 300x300 stage as
   `translate(x,y) scale(scale)`:
   - `scale = targetWidth / bbox.width`
   - `fit.x = 150 - (bbox.x + bbox.width/2) * scale` (and likewise `fit.y`
     for the vertical center you want).
3. Put it on the piece: `fit: { x, y, scale }`. **Leave the path data exactly as
   exported** — the engine converts to stage units itself, so stroke width,
   head size, glow and draw speed (`config.ts`) look identical for every piece.
   Don't rewrite coordinates by hand.
4. Verify with a real screenshot of the finished piece before wiring anything
   else — a wrong `fit` is easy to miss if you only check for errors.

## 5. Wiring it in

- Create `src/fab/pieces/<name>.ts` exporting a `Piece`
  (`{ id, fit, strokes, pivots?, act? }`, types in `src/fab/types.ts`). Give
  every stroke a stable `id` — acts refer to strokes by id, not index. Add the
  piece to the array in `src/fab/pieces/index.ts`; the sequencer plays the
  queue in order and loops.
- Anything that moves *after* the drawing exists goes in the piece's `act`
  (wing flap, falling drop, wordmark pop). Use the `Scene` API
  (`scene.stroke(id)`, `scene.pivot(name)`, `scene.animate/play`,
  `scene.overlay`) and the reusable behaviours in `src/fab/acts.ts`. Acts use
  the Web Animations API — no CSS keyframes needed. Everything an act creates is
  undone when the piece is torn down after its transition (animations cancelled,
  overlays removed, reshaped strokes restored); acts never clean up after
  themselves.
- Rotation pivots (wing shoulders etc.) are named points in the piece's source
  space, declared in `pivots` (draw them in Inkscape as tiny circles labelled
  `pivot-<name>` and copy their centers).
- Stroke direction matters: the laser starts at each path's first point
  (Inkscape: Path > Reverse flips it). Compound paths (several `M`s) should be
  split into separate strokes.

## 6. Verifying it actually works — do not trust "the code looks right"

This project has a real, documented history of animations that looked
correct in source but did nothing or did the wrong thing at runtime. Do
not skip verification. Specifically:

- **Wait on state, not time.** The stage exposes `data-fab-piece` and
  `data-fab-state` (`building | acting | transitioning | static`) on
  `#fab-stage`. Use `wait_for_function` on those instead of guessing durations,
  e.g. screenshot the finished piece when the state becomes `acting`.
- **Serve the page for real** (e.g. `python3 -m http.server` against the
  built `dist/` output, or run the dev server) and load it with Playwright.
  Do not rely solely on opening a static `file://` HTML export — some
  browser behaviors differ, and this component uses a real `<script>` tag
  that needs to actually execute.
- **Measure rendered state at two or more points in time and diff it** —
  e.g. query `getBoundingClientRect()`, `getBBox()`, or a specific
  attribute like `fill-opacity` before and after a wait, and confirm the
  values actually changed. Do not conclude an animation works just because
  the markup/CSS "should" produce motion.
- **`getAttribute('d')` is not reliable** for checking whether a path is
  actively animating — some animation techniques update the rendered
  presentation without rewriting the DOM attribute string. Prefer
  `getBBox()` or a real screenshot comparison.
- **When multiple animated elements exist on the page** (Nav icons, the
  theme toggle, other pieces already in the sequence), scope your queries
  to a specific, unique selector — an `id`, or a distinctive class/viewBox
  combination. A generic `document.querySelector('path')` will silently
  grab the wrong element and give you a false read.
- **Check thin straight strokes.** The glow filter used to clip lines whose
  bounding box is thinner than the stroke (a vertical leg), so they looked
  crisp while big shapes looked soft. The engine now sets one filter region
  around the whole piece (`fitFilterRegion`); if a new piece's thin lines look
  different from its big shapes, look there first. `Piece.glow` scales the
  glow per piece (0 = crisp).
- The head tracks the drawing tip with `getPointAtLength(len - v)` while a
  stroke is drawn (dashoffset `len -> 0`). Verify with a screenshot, not by
  reasoning.
- **Get a screenshot of the actual finished state**, not just a mid-motion
  frame, in both light and dark mode, before telling the person it works.
  Guess timing generously and re-check with `getBoundingClientRect()`/
  element counts if a screenshot lands mid-animation rather than assuming
  your timing estimate was right — cumulative sequence timing is easy to
  underestimate once several strokes, holds, and fades are chained
  together.

## 7. Clean up before finishing

- Kill any local HTTP server / background process you started for
  testing.
- Remove any throwaway test HTML files you created outside the repo
  (e.g. in `/tmp`) — they're not part of the deliverable.
- Throwaway preview routes inside the repo are fine while iterating, but
  delete them once the piece is folded into `pieces/index.ts`, per
  `PROJECT_PLAN.md` §5.7.
- Send the person only the actual changed/new files at their real
  repo-relative paths — not a full repo re-zip, not extra files they
  didn't ask for. This has been corrected explicitly before in this
  project.

### Cloud and rain (generated, not drawn)

Nothing in `art/` describes the cloud or the rain; both are generated.

- `pieces/cloud.ts`: `cloudAt(rainFrom, baseY)` builds the outline from five overlapping circles on a
  flat underside (edit `LOBES` to reshape it); `cloudPiece(spec)` makes it a laser-drawn piece.
  `rainFrom` is the leftmost point of the underside that rains; `scene.ts` sets it to the horizontal
  centre of the open petal 2, and draws the cloud `CLOUD_DELAY_MS` (1.2 s) after the flower has opened.
- `rain.ts`: `startRain(...)` falls drops from the underside (only between `from` and `to`) onto
  `Surface`s taken from real path data (the five open petals, the two leaves, the hill; see
  `rainSurfaces` in `scene.ts`). Each landing throws a splash (droplets on ballistic arcs; half the
  ground hits also get a shallow ripple crown). A petal or leaf is a `Spring`: an underdamped torsion
  spring hinged at its base. A drop gives it angular momentum from where and how it lands (r x J), so
  it dips, rebounds past rest and rings out; drops landing meanwhile just add. Tune in `scene.ts`:
  `freqHz` / `zeta` per body, and `gain` (default 0.3, about a 6 degree first dip) in `rain.ts`;
  rain density (`perSecond`), ramp-up (`rampMs`) and fall speed are in `startRain`.
- Rain keeps going until the chapter is torn down (it is a background task of the `rain` layer).
- The rain is time-stretched for the eye (real drops would cross the frame in ~0.05 s); splash gravity
  is in `rain.ts` (`GRAVITY`).

### Timing and order notes

- The laser leaves for the plant when the bird reaches world x = `PLANT_START_X` (251 in `scene.ts`),
  while the bird is still flying and the camera is coming to rest (about 3 s earlier than before).
- The bird is drawn feet-first via `drawOrder` on the bird piece in `scene.ts`: left foot, left leg,
  right foot, right leg, body, eye, pupil, tail, wing. Stacking order is unchanged.
- The laser head fades in (`CONFIG.headFadeInMs`) whenever it appears, e.g. after page load.

### The drop's journey, the splash, and the loop (round 2 onward)

- **Camera zoom.** `camera.moveTo({x,y,across}, ms)` glides the position and the zoom together;
  `camera.frame(...)` / `camera.setAcross(n)` set them at once. Every layer listens to the zoom
  (`LayerView.onZoom`) and re-weighs its strokes and glow, so lines keep the weight they have at the
  home view however far the camera is in. Generated marks (rain streaks, ripples, splash droplets)
  do the same in `rain.ts` / `pond.ts` / `drip.ts`.
- **The drop** (`drip.ts`, `dripOnPetal`): falls onto petal 2, forms a bead, slides down the petal's
  upper edge (gravity along the surface against a viscous grip: `GRIP`, `STICK`), hangs and swells at the
  tip (the petal sags under its weight: `Spring.setRest`), lets go (the petal rings back up), and falls on
  an exact parabola to `LAND_X` in the water. The camera follows from `scene.ts` (`trail`).
  Tune in `scene.ts`: `CLOUD_DELAY_MS`, `ZOOM_AFTER_RAIN_MS`, `PETAL_SHOT`, `HERO_OFFSET`, `LAND_X`,
  `BEAD_RADIUS`, `SPLASH_SHOT`, `HOLD_AFTER_SPLASH_MS`, `PAN_BACK_MS`.
- **The splash** (`pond.ts`): plays `art/splash.json` (made by `scripts/splash-sim.mjs`, nothing changed
  there) on the real water: the surface profile reshapes the `puddle` line and the `puddle-fill`
  body; crown, jet and droplets are drawn as in `art/splash-preview.html`, at the scale of the drop
  (the falling drop's radius, in world units, per drop radius of the data). The surface eases to nothing at the hill's wall.
  Re-run the sim and the new file is picked up as it is.
- **The loop.** `birdToFlower.run` is a loop of rounds. Only the ground and the water stay between
  rounds. During the pan back the sun, cloud, plant and flower fade out and the rain stops; the next
  round draws all of them again.
- **The plant stands `PLANT_SHIFT` (scene.ts) from where the art has it**: left, onto the hill's shoulder,
  so the drop that falls off the left petal is clear of the hill. All derived positions (petal
  silhouettes, the cloud, the leaves' hinges, the stem's foot) follow from it; if you change the shift,
  keep `y` such that the stem's foot is on the hill. `HALT` (the camera's resting place) was moved with it.
- **The stem is not rigid** (`stem.ts`): it is a cantilever with a slow, damped spring at its foot. A drop that
  knocks a petal or a leaf pushes the whole plant (`Surface.also`), the stem bends (its path is redrawn
  each frame by `bendPath`), and the flower and leaves lean with it (`Surface.carry`, `Spring` `carry`).
  Tune in `scene.ts` where `createStem` is called: `freqHz`, `zeta`, `gain` (how hard a drop pushes),
  `maxTip` (the most it can lean, world units). Now: a median sway of about 0.1 units, rarely over 0.5.
- **The raindrop** that lands on petal 2 is one of the rain's own streaks (`rain.fall`), a little heavier;
  the bead of water that forms is a small circle (`BEAD_RADIUS`). The splash is made at the scale of the
  drop that finally falls (about 1.2 times the bead).
- **The body outline** of the bird starts and ends at the node nearest the left leg (`startClosedPathNear`
  in scene.ts rewrites the path at load; `bird.strokes.ts` is untouched).
- **Legs drawn from the foot up**: a stroke can set `reverse: true` (types.ts): the laser draws it end
  to start; the path data, and what acts do with it, are unchanged.

