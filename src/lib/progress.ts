/**
 * Top-of-page loading bar for router.ts.
 * startProgress() arms it, finishProgress() completes and hides it.
 */

import styles from "./progress.module.css";

let bar: HTMLDivElement | null = null;
let showTimeout: number | undefined;
let hideTimeout: number | undefined;
let trickle: number | undefined;
let value = 0;
let visible = false;

function getBar(): HTMLDivElement {
  if (!bar) {
    bar = document.createElement("div");
    bar.className = styles.bar;
    bar.setAttribute("aria-hidden", "true");
    // router.ts only ever replaces #app-content, so <body> children persist.
    document.body.appendChild(bar);
  }
  return bar;
}

function setValue(v: number): void {
  value = v;
  getBar().style.transform = `scaleX(${v})`;
}

/**
 * Starts the bar. It only becomes visible if the navigation is still running
 * after `delay` ms, so instant navigations don't flash it.
 */
export function startProgress(delay = 120): void {
  window.clearTimeout(showTimeout);
  window.clearTimeout(hideTimeout);
  window.clearInterval(trickle);

  showTimeout = window.setTimeout(() => {
    const el = getBar();
    el.style.transition = "none";
    setValue(0);
    void el.offsetWidth; // flush the reset before animating
    el.style.transition = "";
    el.classList.add(styles.active);
    visible = true;
    setValue(0.15);
    // Trickle toward 90%, never reaching it.
    trickle = window.setInterval(
      () => setValue(value + (0.9 - value) * 0.1),
      200,
    );
  }, delay);
}

/** Completes the bar and fades it out. No-op if it never became visible. */
export function finishProgress(): void {
  window.clearTimeout(showTimeout);
  window.clearInterval(trickle);
  if (!visible) return;
  visible = false;
  setValue(1);
  hideTimeout = window.setTimeout(
    () => bar?.classList.remove(styles.active),
    200,
  );
}
