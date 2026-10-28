import type { GalleryLabels, Slide } from "@/lib/gallery";
import { Carousel } from "./carousel";
import styles from "./gallery.module.css";

const ZOOM_MAX = 4;
const ZOOM_PINCH_MIN = 0.5;
const ZOOM_DOUBLE_TAP = 2.5;
const WHEEL_STEP = 1.18;
const SWIPE_FRACTION = 0.12;
const SWIPE_SPEED = 0.4; // px per ms
const NAVIGATE_OVERSCROLL = 60; // px dragged past the edge of a zoomed image
const OVERSCROLL_RESISTANCE = 0.3;
const DISMISS_DISTANCE = 80;
const DISMISS_FADE = 220;
const TAP_MS = 300;

const CLOSE_ICON =
  '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M2 2l16 16M18 2L2 18" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>';

type Mode = "idle" | "pan" | "pinch" | "swipe" | "dismiss";

function make<K extends keyof HTMLElementTagNameMap>(tag: K, className: string, label?: string): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  el.className = className;
  if (label) el.setAttribute("aria-label", label);
  if (el instanceof HTMLButtonElement) el.type = "button";
  return el;
}

/**
 * Opens the fullscreen viewer on `slides[start]` and returns its close
 * function. Swipe, arrows and thumbnails move between images (looping);
 * pinch, wheel, double tap and drag zoom and pan; swiping down, Escape or a
 * tap beside the image close it.
 */
export function openViewer(slides: Slide[], start: number, labels: GalleryLabels, onClose: () => void): () => void {
  const opener = document.activeElement as HTMLElement | null;
  const single = slides.length < 2;

  const overlay = make("div", styles.overlay);
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  const closeBtn = make("button", styles.close, labels.close);
  closeBtn.innerHTML = CLOSE_ICON;
  const frame = make("div", styles.frame);
  const stage = make("div", styles.stage);
  frame.append(stage);
  overlay.append(closeBtn, frame);

  const navButtons = single
    ? []
    : ([-1, 1] as const).map((dir) => {
        const btn = make("button", `${styles.nav} ${dir === -1 ? styles.prev : styles.next}`, dir === -1 ? labels.previous : labels.next);
        btn.textContent = dir === -1 ? "‹" : "›";
        btn.addEventListener("click", () => navigate(dir));
        return btn;
      });
  frame.append(...navButtons);

  const thumbs = single
    ? []
    : slides.map((slide, i) => {
        const btn = make("button", styles.thumb, labels.image.replace("{n}", String(i + 1)).replace("{total}", String(slides.length)));
        const img = new Image();
        img.src = slide.src;
        img.alt = "";
        img.loading = "lazy";
        img.draggable = false;
        btn.append(img);
        btn.addEventListener("click", () => {
          resetView();
          carousel.goTo(i);
        });
        return btn;
      });
  if (!single) {
    const trail = make("div", styles.trail);
    trail.append(...thumbs);
    overlay.append(trail);
  }

  const carousel = new Carousel(stage, slides, {
    panelClass: styles.panel,
    imgClass: styles.contain,
    start,
    onMove: highlight,
  });
  highlight(carousel.index);

  function highlight(index: number): void {
    thumbs.forEach((t, i) => t.classList.toggle(styles.current, i === index));
    thumbs[index]?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
  }

  // ── Zoom and pan: the current image is moved with a CSS transform ──
  let scale = 1;
  let tx = 0;
  let ty = 0;
  const zoomed = () => scale > 1.01;

  /** The size the current image is drawn at inside the stage (it is letterboxed). */
  function drawn() {
    const cw = stage.clientWidth;
    const ch = stage.clientHeight;
    const { naturalWidth, naturalHeight } = carousel.img;
    const aspect = naturalWidth / naturalHeight;
    if (!(aspect > 0)) return { cw, ch, w: cw, h: ch };
    return cw / ch > aspect ? { cw, ch, w: ch * aspect, h: ch } : { cw, ch, w: cw, h: cw / aspect };
  }

  function setView(s: number, x: number, y: number, animate = false): void {
    const { cw, ch, w, h } = drawn();
    const maxX = Math.max(0, (w * s - cw) / 2);
    const maxY = Math.max(0, (h * s - ch) / 2);
    scale = s;
    tx = Math.min(maxX, Math.max(-maxX, x));
    ty = Math.min(maxY, Math.max(-maxY, y));
    paint(animate);
  }

  function paint(animate = false): void {
    carousel.img.style.transition = animate ? "transform 0.2s var(--ease-standard)" : "none";
    carousel.img.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`;
    navButtons.forEach((b) => (b.hidden = zoomed()));
    stage.dataset.grab = String(zoomed() || !single);
  }

  /** Back to the fitted image straight away, on every panel. */
  function resetView(): void {
    scale = 1;
    tx = ty = 0;
    carousel.imgs.forEach((img) => (img.style.transform = ""));
    paint();
  }

  /** Point relative to the stage centre, which the zoom is centred on. */
  function fromCentre(clientX: number, clientY: number) {
    const r = stage.getBoundingClientRect();
    return { x: clientX - r.left - r.width / 2, y: clientY - r.top - r.height / 2 };
  }

  function navigate(dir: 1 | -1): void {
    resetView();
    carousel.step(dir);
  }

  function setDismiss(y: number, animate = false): void {
    const progress = Math.min(1, y / DISMISS_FADE);
    overlay.style.setProperty("--fade", String(1 - progress));
    carousel.img.style.transition = animate ? "transform 0.3s var(--ease-standard)" : "none";
    carousel.img.style.transform = y ? `translateY(${y}px) scale(${1 - progress * 0.12})` : "";
  }

  // ── Pointers: one finger pans, swipes or dismisses; two pinch ──
  const pointers = new Map<number, { x: number; y: number }>();
  let mode: Mode = "idle";
  let origin = { x: 0, y: 0, t: 0, tx: 0, ty: 0 };
  let overscroll = 0;
  let pinch = { dist: 0, mid: { x: 0, y: 0 }, scale: 1, tx: 0, ty: 0 };
  let lastTap = { t: 0, x: 0, y: 0 };

  const pinchState = () => {
    const [a, b] = Array.from(pointers.values());
    return { dist: Math.hypot(a.x - b.x, a.y - b.y), mid: fromCentre((a.x + b.x) / 2, (a.y + b.y) / 2) };
  };

  stage.addEventListener("pointerdown", (e) => {
    stage.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 2) {
      carousel.release(0);
      setDismiss(0);
      mode = "pinch";
      pinch = { ...pinchState(), scale, tx, ty };
    } else if (pointers.size === 1) {
      mode = zoomed() ? "pan" : "idle";
      origin = { x: e.clientX, y: e.clientY, t: performance.now(), tx, ty };
      overscroll = 0;
    }
  });

  stage.addEventListener("pointermove", (e) => {
    const p = pointers.get(e.pointerId);
    if (!p) return;
    p.x = e.clientX;
    p.y = e.clientY;

    if (mode === "pinch" && pointers.size === 2) {
      const { dist, mid } = pinchState();
      const next = Math.min(ZOOM_MAX, Math.max(ZOOM_PINCH_MIN, pinch.scale * (dist / pinch.dist)));
      const k = next / pinch.scale;
      setView(next, (pinch.tx - pinch.mid.x) * k + mid.x, (pinch.ty - pinch.mid.y) * k + mid.y);
      return;
    }
    if (pointers.size !== 1) return;

    const dx = e.clientX - origin.x;
    const dy = e.clientY - origin.y;
    if (mode === "idle" && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) {
      if (Math.abs(dx) >= Math.abs(dy)) mode = "swipe";
      else if (dy > 0 && e.pointerType !== "mouse") mode = "dismiss";
    }
    if (mode === "pan") {
      // Past the edge the image gives a little, and a long pull moves on to the next one.
      const { cw, w } = drawn();
      const rawX = origin.tx + dx;
      const maxX = Math.max(0, (w * scale - cw) / 2);
      overscroll = rawX - Math.min(maxX, Math.max(-maxX, rawX));
      setView(scale, rawX, origin.ty + dy);
      tx += overscroll * OVERSCROLL_RESISTANCE;
      paint();
    } else if (mode === "swipe") carousel.drag(dx);
    else if (mode === "dismiss") setDismiss(Math.max(0, dy));
  });

  const onRelease = (e: PointerEvent) => {
    if (!pointers.delete(e.pointerId)) return;
    const dx = e.clientX - origin.x;
    const dy = e.clientY - origin.y;
    const elapsed = Math.max(1, performance.now() - origin.t);
    const wasMode = mode;
    mode = "idle";

    if (wasMode === "pinch") {
      // The finger left over is ignored until it lifts too.
      pointers.clear();
      if (scale < 1.05) setView(1, 0, 0, true);
      else setView(scale, tx, ty, true);
      return;
    }
    if (wasMode === "swipe") {
      const fast = Math.abs(dx) / elapsed > SWIPE_SPEED;
      const far = Math.abs(dx) / stage.clientWidth > SWIPE_FRACTION;
      carousel.release(fast || far ? (dx > 0 ? -1 : 1) : 0);
    } else if (wasMode === "dismiss") {
      if (dy > DISMISS_DISTANCE) close();
      else setDismiss(0, true);
    } else if (wasMode === "pan" && Math.abs(overscroll) > NAVIGATE_OVERSCROLL) {
      navigate(overscroll > 0 ? -1 : 1);
    } else if (wasMode === "pan" && Math.abs(overscroll) > 1) {
      setView(scale, tx, ty, true);
    }

    if ((wasMode === "idle" || wasMode === "pan") && elapsed < TAP_MS && Math.hypot(dx, dy) < 10) tap(e.clientX, e.clientY);
  };
  stage.addEventListener("pointerup", onRelease);
  stage.addEventListener("pointercancel", onRelease);

  /** A tap beside the image closes; two quick taps toggle zoom. */
  function tap(x: number, y: number): void {
    const { w, h } = drawn();
    const p = fromCentre(x, y);
    if (!zoomed() && (Math.abs(p.x) > w / 2 || Math.abs(p.y) > h / 2)) return close();
    const now = performance.now();
    if (now - lastTap.t < TAP_MS && Math.hypot(x - lastTap.x, y - lastTap.y) < 40) {
      lastTap.t = 0;
      if (zoomed()) setView(1, 0, 0, true);
      else setView(ZOOM_DOUBLE_TAP, -p.x * (ZOOM_DOUBLE_TAP - 1), -p.y * (ZOOM_DOUBLE_TAP - 1), true);
    } else lastTap = { t: now, x, y };
  }

  stage.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();
      const next = Math.min(ZOOM_MAX, Math.max(1, scale * (e.deltaY > 0 ? 1 / WHEEL_STEP : WHEEL_STEP)));
      const k = next / scale;
      const p = fromCentre(e.clientX, e.clientY);
      setView(next, (tx - p.x) * k + p.x, (ty - p.y) * k + p.y);
    },
    { passive: false },
  );

  // ── Open and close ──
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Escape") close();
    else if (!single && e.key === "ArrowRight") navigate(1);
    else if (!single && e.key === "ArrowLeft") navigate(-1);
  };
  closeBtn.addEventListener("click", () => close());
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) close();
  });
  document.addEventListener("keydown", onKey);

  // Keep focus and screen readers inside the dialog.
  const outside = Array.from(document.body.children) as HTMLElement[];
  outside.forEach((el) => (el.inert = true));
  document.body.style.overflow = "hidden";
  document.body.append(overlay);
  paint();
  closeBtn.focus();

  let closed = false;
  function close(): void {
    if (closed) return;
    closed = true;
    document.removeEventListener("keydown", onKey);
    carousel.destroy();
    overlay.remove();
    outside.forEach((el) => (el.inert = false));
    document.body.style.overflow = "";
    opener?.focus();
    onClose();
  }
  return close;
}
