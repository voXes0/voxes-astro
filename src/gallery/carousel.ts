import type { Slide } from "@/lib/gallery";

export const STEP_MS = 350;

interface Options {
  panelClass: string;
  imgClass: string;
  start?: number;
  /** Called as a move begins, with the slide it is heading to. */
  onMove?: (index: number) => void;
}

/**
 * A looping slider that only ever holds three panels: previous, current and
 * next. Moving slides the panels over, then rotates them so the current one
 * is never re-rendered.
 */
export class Carousel {
  /** The slide shown, or the one being slid to. */
  index: number;
  private panels: HTMLElement[];
  private busy = false;
  private timer = 0;

  constructor(
    root: HTMLElement,
    private slides: Slide[],
    private opts: Options,
  ) {
    this.index = opts.start ?? 0;
    this.panels = [0, 1, 2].map(() => {
      const panel = document.createElement("div");
      panel.className = opts.panelClass;
      const img = new Image();
      img.className = opts.imgClass;
      img.draggable = false;
      panel.append(img);
      return panel;
    });
    root.prepend(...this.panels);
    this.fill();
    this.place();
  }

  get imgs(): HTMLImageElement[] {
    return this.panels.map((p) => p.firstElementChild as HTMLImageElement);
  }

  /** The image in view. */
  get img(): HTMLImageElement {
    return this.imgs[1];
  }

  step(dir: 1 | -1, to = this.wrap(this.index + dir)): void {
    if (this.busy || this.slides.length < 2 || to === this.index) return;
    this.busy = true;
    this.index = to;
    this.opts.onMove?.(to);
    // Put the target next to the current slide, on the side it slides in from.
    this.setSlide(this.imgs[dir === 1 ? 2 : 0], to);
    this.place(-dir * 100, 0, true);
    this.timer = window.setTimeout(() => {
      const [prev, cur, next] = this.panels;
      this.panels = dir === 1 ? [cur, next, prev] : [next, prev, cur];
      this.fill();
      this.place();
      this.busy = false;
    }, STEP_MS);
  }

  goTo(index: number): void {
    if (index !== this.index) this.step(index > this.index ? 1 : -1, index);
  }

  /** Follows a finger, `px` from rest. */
  drag(px: number): void {
    if (!this.busy && this.slides.length > 1) this.place(0, px);
  }

  /** Lets go of a drag: slide on in `dir`, or spring back when 0. */
  release(dir: 1 | -1 | 0): void {
    if (dir) this.step(dir);
    else if (!this.busy) this.place(0, 0, true);
  }

  destroy(): void {
    clearTimeout(this.timer);
  }

  private wrap(i: number): number {
    const n = this.slides.length;
    return (i + n) % n;
  }

  private setSlide(img: HTMLImageElement, i: number): void {
    const { src, alt } = this.slides[i];
    if (img.getAttribute("src") !== src) img.src = src;
    img.alt = alt;
  }

  private fill(): void {
    const [prev, cur, next] = this.imgs;
    this.setSlide(cur, this.index);
    if (this.slides.length > 1) {
      this.setSlide(prev, this.wrap(this.index - 1));
      this.setSlide(next, this.wrap(this.index + 1));
    }
  }

  /** Panels sit side by side; `shift` (in panel widths, as %) and `drag` (px) move them all together. */
  private place(shift = 0, drag = 0, animate = false): void {
    this.panels.forEach((panel, i) => {
      panel.style.transition = animate ? `transform ${STEP_MS}ms var(--ease-standard)` : "none";
      panel.style.transform = `translateX(calc(${(i - 1) * 100 + shift}% + ${drag}px))`;
    });
  }
}
