import { createSignal } from "solid-js";

export type Theme = "light" | "dark";

const THEME_KEY = "theme";
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

function readInitialTheme(): Theme {
  if (typeof document === "undefined") return "light";
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

const [theme, setThemeSignal] = createSignal<Theme>(readInitialTheme());

export { theme };

// Re-syncs the signal with the `dark` class on <html>. The module-level read
// above can run before BaseLayout's inline <head> script applies that class,
// leaving a stale value; call this once the script has definitely run (e.g.
// in Nav's onMount).
export function syncThemeFromDom() {
  const actual = readInitialTheme();
  if (actual !== theme()) setThemeSignal(actual);
}

export function setTheme(next: Theme) {
  setThemeSignal(next);
  document.documentElement.classList.toggle("dark", next === "dark");
  try {
    localStorage.setItem(THEME_KEY, next);
  } catch {
    // Storage can be unavailable (private browsing); the cookie below still works.
  }
  document.cookie = `${THEME_KEY}=${next};path=/;max-age=${ONE_YEAR_SECONDS};SameSite=Lax`;
}

let toggleButton: Element | null = null; // last clicked theme toggle
let currentTransition: ViewTransition | null = null;
let pendingTheme: Theme | null = null; // where the in-flight transition is heading

export function toggleTheme(event?: MouseEvent) {
  // Toggle relative to where we're heading, since theme() lags until the
  // transition's update callback has run.
  const next: Theme = (pendingTheme ?? theme()) === "dark" ? "light" : "dark";

  const canAnimate =
    typeof document.startViewTransition === "function" &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!canAnimate) {
    setTheme(next);
    return;
  }

  // Origin of the wave: the centre of the clicked button (keyboard-safe).
  const button =
    (event?.target as Element | null)?.closest?.("button") ?? toggleButton;
  toggleButton = button;
  const rect = button?.getBoundingClientRect();
  const w = window.innerWidth;
  const h = window.innerHeight;
  const x = rect ? rect.left + rect.width / 2 : w / 2;
  const y = rect ? rect.top + rect.height / 2 : h / 2;
  const feather = Math.min(w, h) * 0.3; // softness of the leading edge
  const radius = Math.hypot(Math.max(x, w - x), Math.max(y, h - y));

  const root = document.documentElement;
  root.style.setProperty("--theme-x", `${x}px`);
  root.style.setProperty("--theme-y", `${y}px`);
  root.style.setProperty("--theme-feather", `${feather}px`);
  root.style.setProperty("--theme-end", `${radius + feather}px`);
  // A data attribute, not a class: router.ts rewrites <html>'s className.
  root.setAttribute("data-theme-transition", "");

  // A click mid-wave skips the running transition (its theme is applied
  // immediately) and starts a new wave from that state.
  currentTransition?.skipTransition();

  pendingTheme = next;
  const transition = document.startViewTransition(() => setTheme(next));
  currentTransition = transition;

  const done = () => {
    if (currentTransition !== transition) return; // a newer click took over
    currentTransition = null;
    pendingTheme = null;
    root.removeAttribute("data-theme-transition");
    for (const v of ["x", "y", "feather", "end"]) {
      root.style.removeProperty(`--theme-${v}`);
    }
  };
  transition.finished.then(done, done);
}

if (typeof document !== "undefined") {
  document.addEventListener(
    "click",
    (e) => {
      if (!currentTransition || !toggleButton) return;
      if ((e.target as Element | null)?.closest?.("button")) return;
      const r = toggleButton.getBoundingClientRect();
      const inside =
        e.clientX >= r.left &&
        e.clientX <= r.right &&
        e.clientY >= r.top &&
        e.clientY <= r.bottom;
      if (inside) toggleTheme(e);
    },
    true,
  );
}