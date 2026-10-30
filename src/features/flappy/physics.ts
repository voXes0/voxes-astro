import { BIRD, PHYSICS, PIPE, WORLD } from "./config";
import type { ResolvedLevel } from "./levels";

/**
 * The rules of the game, with no DOM in sight: a fixed-step simulation the
 * renderer reads from. Keeping it pure means a bot can play a level in Node
 * to check it is beatable.
 */
export type Phase = "ready" | "playing" | "crashed" | "finished";

export interface Sim {
  phase: Phase;
  /** Distance the world has scrolled; the bird sits at world x = scroll + BIRD.x. */
  scroll: number;
  y: number;
  vy: number;
  /** Gates fully passed so far. */
  passed: number;
  /** Seconds spent in the current phase (drives the post-crash / post-win timing). */
  phaseT: number;
  /** The bird has come to rest on the ground after a crash. */
  settled: boolean;
  /** After a win: extra distance the bird has flown ahead of its fixed spot. */
  exitX: number;
  readonly level: ResolvedLevel;
  flap(): void;
  step(dt: number): void;
  reset(): void;
}

const half = PIPE.w / 2;
const capHalf = PIPE.capW / 2;

/** Circle against axis-aligned rectangle. */
function hitsRect(cx: number, cy: number, x0: number, y0: number, x1: number, y1: number): boolean {
  const nx = Math.max(x0, Math.min(cx, x1));
  const ny = Math.max(y0, Math.min(cy, y1));
  const dx = cx - nx;
  const dy = cy - ny;
  return dx * dx + dy * dy < BIRD.r * BIRD.r;
}

/** True if the bird at (bx, by) touches the gate (body or cap, top or bottom). */
export function hitsGate(bx: number, by: number, g: { x: number; gapY: number; gap: number }): boolean {
  if (Math.abs(bx - g.x) > capHalf + BIRD.r) return false;
  const top = g.gapY - g.gap / 2;
  const bottom = g.gapY + g.gap / 2;
  return (
    hitsRect(bx, by, g.x - half, -1000, g.x + half, top) ||
    hitsRect(bx, by, g.x - capHalf, top - PIPE.capH, g.x + capHalf, top) ||
    hitsRect(bx, by, g.x - half, bottom, g.x + half, WORLD.floorY + 1000) ||
    hitsRect(bx, by, g.x - capHalf, bottom, g.x + capHalf, bottom + PIPE.capH)
  );
}

export function createSim(level: ResolvedLevel): Sim {
  const sim: Sim = {
    phase: "ready",
    scroll: 0,
    y: BIRD.startY,
    vy: 0,
    passed: 0,
    phaseT: 0,
    settled: false,
    exitX: 0,
    level,
    flap() {
      if (sim.phase === "ready") setPhase("playing");
      if (sim.phase === "playing") sim.vy = -PHYSICS.flap;
    },
    step(dt) {
      sim.phaseT += dt;
      if (sim.phase === "playing") play(dt);
      else if (sim.phase === "crashed") fall(dt);
      else if (sim.phase === "finished") glide(dt);
    },
    reset() {
      sim.phase = "ready";
      sim.scroll = 0;
      sim.y = BIRD.startY;
      sim.vy = 0;
      sim.passed = 0;
      sim.phaseT = 0;
      sim.settled = false;
      sim.exitX = 0;
    },
  };

  function setPhase(p: Phase) {
    sim.phase = p;
    sim.phaseT = 0;
  }

  function gravity(dt: number) {
    sim.vy = Math.min(PHYSICS.maxFall, sim.vy + PHYSICS.gravity * dt);
    sim.y += sim.vy * dt;
  }

  function play(dt: number) {
    gravity(dt);
    sim.scroll += level.speed * dt;
    // The ceiling is a soft wall: it stops the bird but never ends the run.
    if (sim.y < BIRD.r) {
      sim.y = BIRD.r;
      sim.vy = Math.max(0, sim.vy);
    }
    const bx = sim.scroll + BIRD.x;

    if (sim.y + BIRD.r >= WORLD.floorY) {
      sim.y = WORLD.floorY - BIRD.r;
      setPhase("crashed");
      sim.settled = true;
      return;
    }
    for (const g of level.gates) {
      if (hitsGate(bx, sim.y, g)) {
        setPhase("crashed");
        sim.vy = Math.max(sim.vy, 0);
        return;
      }
    }
    while (sim.passed < level.gates.length && bx > level.gates[sim.passed].x + half + BIRD.r) {
      sim.passed++;
    }
    if (bx >= level.finishX) {
      sim.passed = level.gates.length;
      setPhase("finished");
    }
  }

  function fall(dt: number) {
    if (sim.settled) return;
    gravity(dt);
    if (sim.y + BIRD.r >= WORLD.floorY) {
      sim.y = WORLD.floorY - BIRD.r;
      sim.settled = true;
    }
  }

  function glide(dt: number) {
    sim.scroll += level.speed * dt;
    // Level out, then climb away to the right (the fabricator's "flyout").
    sim.vy += (-110 - sim.vy) * Math.min(1, dt * 3);
    sim.y += sim.vy * dt;
    sim.exitX += (60 + 520 * sim.phaseT * sim.phaseT) * dt;
  }

  return sim;
}
