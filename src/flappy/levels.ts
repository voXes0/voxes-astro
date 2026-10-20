import { BIRD } from "./config";

export interface Gate {
  /** Distance from the previous gate (or from the start, for the first). */
  after: number;
  /** Height of the middle of the opening. */
  gapY: number;
  /** Height of the opening. */
  gap: number;
}

export interface Level {
  id: string;
  /** Scroll speed, world units per second. */
  speed: number;
  gates: Gate[];
  /** Run-out after the last gate, before the finish line. */
  finishAfter: number;
}

/** A level resolved to absolute positions, which is what the game consumes. */
export interface ResolvedLevel {
  id: string;
  speed: number;
  /** World x of each gate's centre, with the bird starting at world x = BIRD.x. */
  gates: { x: number; gapY: number; gap: number }[];
  finishX: number;
}

export function resolveLevel(level: Level): ResolvedLevel {
  let x = BIRD.x;
  const gates = level.gates.map((g) => {
    x += g.after;
    return { x, gapY: g.gapY, gap: g.gap };
  });
  return { id: level.id, speed: level.speed, gates, finishX: x + level.finishAfter };
}

/**
 * The 404 level: ten gates, about twenty seconds. It starts wide and level,
 * then the openings narrow a little and consecutive openings shift further
 * apart, but it stays forgiving at the end (the last opening is still more
 * than five bird heights tall).
 * Add a level = add an entry here and pass its id as `level`.
 */
const gates: Level = {
  id: "gates",
  speed: 135,
  gates: [
    { after: 330, gapY: 150, gap: 150 },
    { after: 260, gapY: 150, gap: 146 },
    { after: 260, gapY: 140, gap: 142 },
    { after: 250, gapY: 165, gap: 138 },
    { after: 250, gapY: 135, gap: 134 },
    { after: 245, gapY: 165, gap: 130 },
    { after: 240, gapY: 125, gap: 126 },
    { after: 240, gapY: 165, gap: 124 },
    { after: 235, gapY: 135, gap: 122 },
    { after: 235, gapY: 160, gap: 120 },
  ],
  finishAfter: 300,
};

export const levels: Record<string, Level> = { [gates.id]: gates };
export const defaultLevelId = gates.id;
