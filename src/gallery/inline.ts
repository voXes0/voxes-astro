import type { GalleryData } from "@/lib/gallery";
import { Carousel } from "./carousel";
import styles from "./gallery.module.css";

const SWIPE_FRACTION = 0.12;
const SWIPE_SPEED = 0.4; // px per ms
const EXPAND_ICON =
  '<svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true"><path d="M1 1h5M1 1v5M17 1h-5M17 1v5M1 17h5M1 17v-5M17 17h-5M17 17v-5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>';

const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Makes every `[data-gallery]` figure open the fullscreen viewer, and turns
 * the ones with several images into sliders. The viewer shows the images of
 * all the figures on the page, in page order. Returns the teardown.
 */
export function mountGalleries(hosts: HTMLElement[]): () => void {
  const galleries = hosts.map((host) => JSON.parse(host.dataset.gallery ?? "") as GalleryData);
  const all = galleries.flatMap((g) => g.slides);
  const teardowns: (() => void)[] = [];
  let closeViewer: (() => void) | undefined;
  let viewing = false; // from the tap until the viewer closes

  let start = 0;
  hosts.forEach((host, i) => {
    teardowns.push(mountOne(host, galleries[i], start));
    start += galleries[i].slides.length;
  });

  function mountOne(host: HTMLElement, { slides, labels, autoplay }: GalleryData, first: number): () => void {
    let carousel: Carousel | undefined;
    let dragged = false;
    let timer = 0;
    let visible = false;

    const stop = () => clearInterval(timer);
    const play = () => {
      stop();
      if (autoplay && !reducedMotion && visible && !viewing) {
        timer = window.setInterval(() => carousel?.step(1), autoplay);
      }
    };

    host.classList.add(styles.host);
    const expand = document.createElement("button");
    expand.type = "button";
    expand.className = styles.expand;
    expand.setAttribute("aria-label", labels.open);
    expand.innerHTML = EXPAND_ICON;
    host.append(expand);

    // A tap anywhere opens the viewer, but not the end of a swipe or a dot press.
    host.addEventListener("click", async () => {
      if (dragged || viewing) return;
      viewing = true;
      stop();
      const { openViewer } = await import("./viewer");
      closeViewer = openViewer(all, first + (carousel?.index ?? 0), labels, () => {
        viewing = false;
        closeViewer = undefined;
        play();
      });
    });

    if (slides.length < 2) return () => {};

    const dots = document.createElement("div");
    dots.className = styles.dots;
    const dotButtons = slides.map((_, i) => {
      const dot = document.createElement("button");
      dot.type = "button";
      dot.className = styles.dot;
      dot.setAttribute("aria-label", labels.image.replace("{n}", String(i + 1)).replace("{total}", String(slides.length)));
      dots.append(dot);
      return dot;
    });
    dots.addEventListener("click", (e) => {
      e.stopPropagation();
      const dot = (e.target as Element).closest("button");
      if (dot) carousel?.goTo(dotButtons.indexOf(dot));
      play();
    });

    const build = () => {
      host.classList.add(styles.slider);
      host.querySelector("img")?.remove();
      host.append(dots);
      carousel = new Carousel(host, slides, {
        panelClass: styles.panel,
        imgClass: styles.cover,
        onMove: (index) => dotButtons.forEach((d, i) => d.classList.toggle(styles.active, i === index)),
      });
      dotButtons[0].classList.add(styles.active);
    };

    // Build when the slider is about to be seen; only run while it is.
    const watcher = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        if (visible && !carousel) build();
        play();
      },
      { rootMargin: "200px" },
    );
    watcher.observe(host);

    let down: { x: number; y: number; t: number } | undefined;
    let horizontal: boolean | undefined;

    host.addEventListener("pointerdown", (e) => {
      if (!carousel || (e.target as Element).closest("button")) return;
      down = { x: e.clientX, y: e.clientY, t: performance.now() };
      horizontal = undefined;
      dragged = false;
      stop();
    });
    host.addEventListener("pointermove", (e) => {
      if (!down || !carousel) return;
      const dx = e.clientX - down.x;
      const dy = e.clientY - down.y;
      if (horizontal === undefined && (Math.abs(dx) > 6 || Math.abs(dy) > 6)) {
        horizontal = Math.abs(dx) >= Math.abs(dy);
        if (horizontal) host.setPointerCapture(e.pointerId);
      }
      if (horizontal) {
        dragged = true;
        carousel.drag(dx);
      }
    });
    const release = (e: PointerEvent) => {
      if (!down || !carousel) return;
      if (horizontal) {
        const dx = e.clientX - down.x;
        const fast = Math.abs(dx) / Math.max(1, performance.now() - down.t) > SWIPE_SPEED;
        const far = Math.abs(dx) / host.offsetWidth >= SWIPE_FRACTION;
        carousel.release(fast || far ? (dx < 0 ? 1 : -1) : 0);
        setTimeout(() => (dragged = false)); // after the click that follows the swipe
      }
      down = undefined;
      play();
    };
    host.addEventListener("pointerup", release);
    host.addEventListener("pointercancel", release);

    return () => {
      watcher.disconnect();
      stop();
      carousel?.destroy();
    };
  }

  return () => {
    teardowns.forEach((fn) => fn());
    closeViewer?.();
  };
}
