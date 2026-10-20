/**
 * Minimal client-side router. Astro's <ClientRouter /> replaces <body> and then
 * re-attaches persisted nodes, which still flashes the header and breaks
 * backdrop-filter compositing on the mobile menu. This router only ever
 * replaces the contents of #app-content (page + footer), so <header> and the
 * Nav island are never removed, re-parented or re-hydrated.
 */

import { localeFromPathname, localizedHref } from "@/lib/navigation";

const APP_CONTENT_ID = "app-content";

function getAppContent(doc: Document = document): HTMLElement | null {
  return doc.getElementById(APP_CONTENT_ID);
}

/** True for links this router should handle itself. */
function isRoutable(anchor: HTMLAnchorElement): boolean {
  if (anchor.target && anchor.target !== "_self") return false;
  if (anchor.hasAttribute("download")) return false;
  if (anchor.dataset.noSwap !== undefined) return false;

  const url = new URL(anchor.href, window.location.href);
  if (url.origin !== window.location.origin) return false;

  // Let the browser handle plain in-page hash links.
  if (
    url.pathname === window.location.pathname &&
    url.search === window.location.search &&
    url.hash
  ) {
    return false;
  }

  return true;
}

/**
 * Page-specific CSS (scoped styles, CSS Modules) lives only in that page's
 * <head>. This router never does a real page load, so it must bring the new
 * page's styles across itself. Only global.css is shared by every page.
 */
const STYLE_SELECTOR = 'link[rel="stylesheet"], style';

function styleKey(el: Element): string {
  if (el instanceof HTMLLinkElement) {
    const url = new URL(el.getAttribute("href") ?? "", window.location.href);
    return `link:${url.pathname}${url.search}`;
  }
  // Astro dev tags each injected <style> with the module id it came from.
  return `style:${el.getAttribute("data-vite-dev-id") ?? el.textContent}`;
}

/** Adds the new page's missing stylesheets; resolves once they've loaded. */
async function syncStyles(newDoc: Document): Promise<void> {
  const have = new Set(
    Array.from(document.head.querySelectorAll(STYLE_SELECTOR)).map(styleKey),
  );
  const loading: Promise<void>[] = [];

  newDoc.head.querySelectorAll(STYLE_SELECTOR).forEach((el) => {
    const key = styleKey(el);
    if (have.has(key)) return;
    have.add(key);

    const clone = el.cloneNode(true) as HTMLElement;
    if (clone instanceof HTMLLinkElement) {
      // Wait for it so the new content never paints unstyled. The timeout
      // keeps one slow or failed stylesheet from blocking navigation.
      loading.push(
        new Promise<void>((resolve) => {
          clone.addEventListener("load", () => resolve(), { once: true });
          clone.addEventListener("error", () => resolve(), { once: true });
          window.setTimeout(resolve, 4000);
        }),
      );
    }
    document.head.appendChild(clone);
  });

  await Promise.all(loading);
}

/** Swaps <head> metadata that varies per page/locale. */
function swapHead(newDoc: Document): void {
  document.title = newDoc.title;

  const swapMeta = (selector: string) => {
    const oldEl = document.head.querySelector(selector);
    const newEl = newDoc.head.querySelector(selector);
    if (oldEl && newEl) {
      oldEl.replaceWith(newEl.cloneNode(true));
    } else if (!oldEl && newEl) {
      document.head.appendChild(newEl.cloneNode(true));
    } else if (oldEl && !newEl) {
      oldEl.remove();
    }
  };

  swapMeta('meta[name="description"]');
  swapMeta('link[rel="canonical"]');

  // hreflang alternates: replace the whole set.
  document
    .head
    .querySelectorAll('link[rel="alternate"]')
    .forEach((el) => el.remove());
  newDoc.head
    .querySelectorAll('link[rel="alternate"]')
    .forEach((el) => document.head.appendChild(el.cloneNode(true)));
}

/** Swaps <html> lang/dir (the body font follows `lang` via global.css). */
function swapDocumentAttributes(newDoc: Document): void {
  const newHtml = newDoc.documentElement;
  document.documentElement.setAttribute("lang", newHtml.getAttribute("lang") ?? "en");
  document.documentElement.setAttribute("dir", newHtml.getAttribute("dir") ?? "ltr");

  // Preserve dark-mode class (client-controlled).
  const isDark = document.documentElement.classList.contains("dark");
  document.documentElement.className = isDark ? "dark" : "";
}

/** Static hosts serve one 404 page (English) for every unknown URL, so the
 *  locale is recovered from the URL the visitor actually asked for. */
function notFoundUrlFor(url: string): string {
  const { pathname } = new URL(url, window.location.href);
  return localizedHref("/404", localeFromPathname(pathname));
}

async function navigate(url: string, { push = true } = {}): Promise<void> {
  let html: string;
  try {
    let res = await fetch(url, { headers: { "X-Router": "app" } });
    if (res.status === 404) {
      // Show the right-locale 404 page, but keep the URL the visitor asked for.
      res = await fetch(notFoundUrlFor(url), { headers: { "X-Router": "app" } });
    }
    if (!res.ok) {
      window.location.href = url;
      return;
    }
    html = await res.text();
  } catch {
    // Network failure: fall back to a real navigation.
    window.location.href = url;
    return;
  }

  const parser = new DOMParser();
  const newDoc = parser.parseFromString(html, "text/html");

  const newContent = getAppContent(newDoc);
  const oldContent = getAppContent();
  if (!newContent || !oldContent) {
    // Not an app page: do a real navigation.
    window.location.href = url;
    return;
  }

  await syncStyles(newDoc);
  swapHead(newDoc);
  swapDocumentAttributes(newDoc);
  oldContent.replaceChildren(...Array.from(newContent.childNodes));

  if (push) {
    history.pushState({ appRouter: true }, "", url);
  }

  window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });

  document.dispatchEvent(
    new CustomEvent("app:navigated", { detail: { url } }),
  );
}

function onClick(event: MouseEvent): void {
  if (event.defaultPrevented) return;
  if (event.button !== 0) return; // left click only
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

  const anchor = (event.target as HTMLElement)?.closest?.("a");
  if (!anchor || !anchor.href) return;
  if (!isRoutable(anchor)) return;

  event.preventDefault();
  const url = new URL(anchor.href, window.location.href).toString();
  if (url === window.location.href) {
    // Same page: a real load would scroll to top, so match that.
    window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
    return;
  }
  void navigate(url);
}

function onPopState(): void {
  void navigate(window.location.href, { push: false });
}

history.scrollRestoration = "manual";
document.addEventListener("click", onClick);
window.addEventListener("popstate", onPopState);

// Direct load / refresh on an unknown URL: the host served the English 404.
// If the URL says otherwise, swap in the matching one (URL stays untouched).
(function fixNotFoundLocale() {
  const page = document.querySelector<HTMLElement>("[data-not-found]");
  if (!page) return;
  if (page.dataset.notFound === localeFromPathname(window.location.pathname)) return;
  void navigate(notFoundUrlFor(window.location.href), { push: false });
})();
