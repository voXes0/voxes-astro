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

export function toggleTheme() {
  setTheme(theme() === "dark" ? "light" : "dark");
}