/**
 * Shape of a long-form project page (rendered by components/CaseStudy.astro).
 * A project supplies a hero and an ordered list of sections, each of a `kind`
 * the layout knows. Every block that takes a `figure` can show a
 * photo/screenshot; leave `src` out to render the framed placeholder.
 */

export interface CaseFigure {
  /** Path under /public. Omit to render the placeholder frame. */
  src?: string;
  width?: number;
  height?: number;
  alt: string;
  caption: string;
  /** CSS aspect-ratio for the frame, e.g. "16 / 10". Default "16 / 10". */
  ratio?: string;
}

/** Fields every section can have; `figure` renders after the section's content. */
interface SectionBase {
  /** Anchor id and contents-list target; unique within the study. */
  id: string;
  title: string;
  intro?: string;
  figure?: CaseFigure;
}

/**
 * One section of the page, rendered by its `kind`. A study lists whichever
 * sections it needs, in any order, and the contents list follows. For anything
 * the kinds below don't cover, use "prose" and the study still reads fine.
 */
export type CaseSection = SectionBase &
  (
    | { kind: "brief"; body: string[]; asksLabel: string; asks: string[] }
    | { kind: "prose"; body: string[] }
    | { kind: "timeline"; phases: { title: string; period: string; body: string; figure?: CaseFigure }[] }
    | { kind: "decisions"; items: { title: string; choice: string; why: string; considered: string[] }[] }
    | { kind: "challenges"; items: { title: string; problem: string; solution: string; figure?: CaseFigure }[] }
    | {
        kind: "showcase";
        items: {
          title: string;
          /** Short type label, e.g. "System" or "Component". */
          kind: string;
          body: string;
          points: string[];
          figure: CaseFigure;
        }[];
      }
    | { kind: "lessons"; items: { title: string; body: string }[]; closing?: string }
  );

export interface CaseStudy {
  lead: string;
  facts: { label: string; value: string }[];
  hero: CaseFigure;
  sections: CaseSection[];
}
