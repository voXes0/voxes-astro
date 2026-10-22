import type { Chapter } from "../director";
import { birdToFlower } from "./scene";

/** What the fabricator plays, in a loop (a camera, a world, many pieces at once: see ../director.ts). */
export const chapters: Chapter[] = [birdToFlower];
