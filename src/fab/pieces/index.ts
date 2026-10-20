import type { Chapter } from "../director";
import type { Piece } from "../types";
import { flower } from "./flower";
import { birdToFlower } from "./scene";

/**
 * What the fabricator plays. Chapters (a camera, a world, many pieces at once; see
 * ../director.ts) take precedence; the piece queue is the older "one piece after
 * another" sequencer, used only when there are no chapters.
 */
export const chapters: Chapter[] = [birdToFlower];

export const pieces: Piece[] = [flower];
