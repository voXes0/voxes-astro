import { strokes } from "@/features/fabricator/pieces/bird.strokes";
import { createPoseBlender, flapAmount } from "@/features/fabricator/pose";
import { BIRD, FEEL, FLOW, PHYSICS, PIPE, WING, WORLD } from "./config";
import { defaultLevelId, levels, resolveLevel } from "./levels";
import { createSim } from "./physics";

const NS = "http://www.w3.org/2000/svg";
const GROUND_PERIOD = WORLD.groundDash[0] + WORLD.groundDash[1];
const FLAP_KEYS = new Set([" ", "ArrowUp", "w", "W"]);

type Ui = "ready" | "playing" | "paused" | "crashed" | "finished" | "lost" | "won";

/**
 * Brings one <FlappyBird> to life: input, the fixed-step loop (physics.ts) and
 * the drawing. The markup (bird art, overlays, HUD) comes from the component;
 * this only moves things and builds the level's obstacles. Returns a teardown.
 *
 * Reads from the root's data attributes:
 *   data-level  id in levels.ts            (default: the default level)
 *   data-keys   "visible" | "focus"        (default "visible")
 *   data-locale used to format numbers     (default "en")
 *
 * "visible": Space / ↑ / W work while the game is on screen (what a 404 page
 * wants). "focus": they only work while the game has focus, so embedding it
 * in a long page never steals the page's own Space-to-scroll.
 */
export function mountFlappy(root: HTMLElement): () => void {
  const level = resolveLevel(levels[root.dataset.level ?? ""] ?? levels[defaultLevelId]);
  const focusKeys = root.dataset.keys === "focus";
  const nf = new Intl.NumberFormat(root.dataset.locale ?? "en");
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

  const $ = <T extends Element>(sel: string) => {
    const el = root.querySelector<T>(sel);
    if (!el) throw new Error(`flappy: markup missing ${sel}`);
    return el;
  };
  const world = $<SVGGElement>("[data-flappy-world]");
  const bgGrid = $<SVGGElement>("[data-flappy-bg]");
  const ground = $<SVGLineElement>("[data-flappy-ground]");
  const birdEl = $<SVGGElement>("[data-flappy-bird]");
  const wingEl = $<SVGPathElement>("[data-flappy-wing]");
  const barEl = $<HTMLElement>("[data-flappy-bar]");
  const countEl = $<HTMLElement>("[data-flappy-count]");
  const liveEl = $<HTMLElement>("[data-flappy-live]");
  const retryButtons = root.querySelectorAll<HTMLButtonElement>("[data-flappy-retry]");
  const templated = root.querySelectorAll<HTMLElement>("[data-template]");

  // ── The level's obstacles: built once, then the whole group just scrolls ──
  buildWorld();
  function rect(x: number, y: number, w: number, h: number) {
    const el = document.createElementNS(NS, "rect");
    el.setAttribute("x", String(x));
    el.setAttribute("y", String(y));
    el.setAttribute("width", String(w));
    el.setAttribute("height", String(h));
    el.setAttribute("rx", String(PIPE.radius));
    el.setAttribute("class", "flappy-ob");
    world.appendChild(el);
  }
  function buildWorld() {
    world.replaceChildren();
    for (const g of level.gates) {
      const top = g.gapY - g.gap / 2;
      const bottom = g.gapY + g.gap / 2;
      rect(g.x - PIPE.w / 2, -10, PIPE.w, top + 10);
      rect(g.x - PIPE.capW / 2, top - PIPE.capH, PIPE.capW, PIPE.capH);
      rect(g.x - PIPE.w / 2, bottom, PIPE.w, WORLD.floorY - bottom);
      rect(g.x - PIPE.capW / 2, bottom, PIPE.capW, PIPE.capH);
    }
    const x = level.finishX;
    const line = document.createElementNS(NS, "path");
    line.setAttribute("d", `M${x} 0V${WORLD.floorY}`);
    line.setAttribute("class", "flappy-finish");
    const flag = document.createElementNS(NS, "path");
    flag.setAttribute("d", `M${x} 12H${x + 30}l-9 9l9 9H${x}`);
    flag.setAttribute("class", "flappy-flag");
    world.append(line, flag);
  }

  // ── State ──
  const sim = createSim(level);
  const wing = strokes.find((s) => s.id === "wing");
  if (!wing?.poses) throw new Error("flappy: bird art has no wing poses");
  const blendWing = createPoseBlender("wing", wing.d, wing.poses);

  let ui: Ui = "ready";
  let paused = false;
  let angle = 0;
  let flapT = Infinity; // ms since the last flap
  let wingAmount = -1;
  let bgPos = 0;
  let groundPos = 0;
  let endAt = 0; // when the win / lose message appeared
  let shownPassed = -1;
  let shownProgress = -1;
  let acc = 0;
  let last = 0;
  let raf = 0;
  let onScreen = true;

  const total = level.gates.length;
  const fill = (el: HTMLElement) => {
    el.textContent = (el.dataset.template ?? "")
      .replace("{passed}", nf.format(sim.passed))
      .replace("{total}", nf.format(total));
  };

  function setUi(next: Ui) {
    ui = next;
    root.dataset.state = next;
  }

  function showEnd(kind: "won" | "lost") {
    templated.forEach(fill);
    setUi(kind);
    endAt = performance.now();
    const overlay = root.querySelector<HTMLElement>(`[data-flappy-overlay="${kind}"]`);
    liveEl.textContent = overlay?.textContent?.replace(/\s+/g, " ").trim() ?? "";
    // Focus the button so Enter works, but never scroll the page to get there.
    root.querySelector<HTMLButtonElement>(`[data-flappy-overlay="${kind}"] button`)?.focus({ preventScroll: true });
  }

  function restart() {
    sim.reset();
    angle = 0;
    flapT = Infinity;
    liveEl.textContent = "";
    paused = false;
    setUi("ready");
    root.focus({ preventScroll: true });
  }

  function press() {
    switch (ui) {
      case "ready":
      case "playing":
        sim.flap();
        flapT = 0;
        setUi("playing");
        break;
      case "paused":
        paused = false;
        setUi("playing");
        sim.flap();
        flapT = 0;
        break;
      case "won":
      case "lost":
        if (performance.now() - endAt > FLOW.endCooldownMs) restart();
        break;
      default:
        break; // mid-crash or mid-victory: let the animation finish
    }
  }

  function pause() {
    if (ui !== "playing") return;
    paused = true;
    setUi("paused");
  }

  // ── Input ──
  function isEditable(el: Element | null) {
    return !!el?.closest("input, textarea, select, [contenteditable]");
  }
  function onKeyDown(e: KeyboardEvent) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const target = e.target instanceof Element ? e.target : null;
    if (isEditable(target)) return;
    // A focused link or button elsewhere keeps its own Space / Enter.
    if (target?.closest("a, button") && !root.contains(target)) return;
    if (focusKeys ? !root.contains(document.activeElement) : !onScreen) return;

    const ended = ui === "won" || ui === "lost";
    const isFlap = FLAP_KEYS.has(e.key);
    if (!isFlap && !(ended && e.key === "Enter")) return;
    e.preventDefault();
    if (e.repeat) return; // holding the key must not machine-gun flaps
    press();
  }
  function onPointerDown(e: PointerEvent) {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    if ((e.target as Element).closest("button")) return;
    e.preventDefault();
    root.focus({ preventScroll: true });
    press();
  }
  function onRetry() {
    if (ui === "won" || ui === "lost") restart();
  }

  // ── Loop ──
  const STEP = PHYSICS.step;
  function frame(now: number) {
    raf = requestAnimationFrame(frame);
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
    last = now;
    if (!paused) {
      acc += dt;
      while (acc >= STEP) {
        sim.step(STEP);
        acc -= STEP;
      }
    }
    advance();
    if (!paused) render(dt);
  }

  /** Moves the UI state along as the simulation changes phase. */
  function advance() {
    if (ui === "playing" && sim.phase === "crashed") setUi("crashed");
    else if (ui === "playing" && sim.phase === "finished") setUi("finished");
    else if (ui === "crashed" && sim.settled && sim.phaseT * 1000 >= FLOW.crashMessageMs) showEnd("lost");
    else if (ui === "finished" && sim.phaseT * 1000 >= FLOW.winMessageMs) showEnd("won");
  }

  function render(dt: number) {
    const now = performance.now();
    flapT += dt * 1000;

    // Bird position and tilt.
    const bob = ui === "ready" && !reduceMotion ? Math.sin(now / FEEL.bobPeriodMs) * FEEL.bobAmplitude : 0;
    const x = BIRD.x + (sim.phase === "finished" ? sim.exitX : 0);
    const y = sim.y + bob;
    let target = 0;
    if (sim.phase === "playing") target = Math.max(FEEL.tiltMin, Math.min(FEEL.tiltMax, sim.vy * FEEL.tiltPerVy + FEEL.tiltOffset));
    else if (sim.phase === "crashed") target = FEEL.tiltCrashed;
    else if (sim.phase === "finished") target = FEEL.tiltFinished;
    angle += (target - angle) * Math.min(1, dt * (sim.phase === "crashed" ? FEEL.tiltEaseCrashed : FEEL.tiltEasePlaying));
    birdEl.setAttribute("transform", `translate(${x.toFixed(2)} ${y.toFixed(2)}) rotate(${angle.toFixed(1)})`);

    // Wing: one beat per flap, a lazy beat while hovering, a steady beat on the victory flight.
    let amount = 0;
    if (sim.phase === "ready") amount = flapAmount((now % WING.idleMs) / WING.idleMs, WING.upFraction);
    else if (sim.phase === "finished") amount = flapAmount((now % FEEL.victoryBeatMs) / FEEL.victoryBeatMs, WING.upFraction);
    else if (sim.phase === "playing" && flapT < WING.flapMs) amount = flapAmount(flapT / WING.flapMs, WING.upFraction);
    if (Math.abs(amount - wingAmount) > 0.4) {
      wingAmount = amount;
      wingEl.setAttribute("d", blendWing(amount));
    }

    // Scenery.
    world.setAttribute("transform", `translate(${(-sim.scroll).toFixed(2)} 0)`);
    const running = sim.phase === "playing" || sim.phase === "finished";
    const speed = running ? level.speed : sim.phase === "ready" && !reduceMotion ? FEEL.idleDriftSpeed : 0;
    bgPos = (bgPos + speed * FEEL.gridParallax * dt) % WORLD.grid;
    groundPos = (groundPos + speed * dt) % GROUND_PERIOD;
    bgGrid.setAttribute("transform", `translate(${(-bgPos).toFixed(2)} 0)`);
    ground.setAttribute("stroke-dashoffset", String(-groundPos));

    // HUD, only touched when it changes.
    if (sim.passed !== shownPassed) {
      shownPassed = sim.passed;
      countEl.textContent = `${nf.format(sim.passed)} / ${nf.format(total)}`;
    }
    const progress = Math.max(0, Math.min(1, sim.scroll / (level.finishX - BIRD.x)));
    if (Math.abs(progress - shownProgress) > 0.002 || progress === 0) {
      shownProgress = progress;
      barEl.style.transform = `scaleX(${progress.toFixed(3)})`;
    }
  }

  function start() {
    if (raf || document.hidden || !onScreen) return;
    last = 0;
    raf = requestAnimationFrame(frame);
  }
  function stop() {
    cancelAnimationFrame(raf);
    raf = 0;
    pause(); // never let a run carry on unseen
  }
  function onVisibility() {
    if (document.hidden) stop();
    else start();
  }

  const observer = new IntersectionObserver(
    ([entry]) => {
      onScreen = entry.isIntersecting;
      if (onScreen) start();
      else stop();
    },
    { threshold: 0.25 },
  );

  observer.observe(root);
  document.addEventListener("visibilitychange", onVisibility);
  window.addEventListener("keydown", onKeyDown);
  root.addEventListener("pointerdown", onPointerDown);
  retryButtons.forEach((b) => b.addEventListener("click", onRetry));
  root.dataset.mounted = "";
  setUi("ready");
  render(0);
  start();

  return () => {
    cancelAnimationFrame(raf);
    raf = 0;
    observer.disconnect();
    document.removeEventListener("visibilitychange", onVisibility);
    window.removeEventListener("keydown", onKeyDown);
    root.removeEventListener("pointerdown", onPointerDown);
    retryButtons.forEach((b) => b.removeEventListener("click", onRetry));
    delete root.dataset.mounted;
  };
}
