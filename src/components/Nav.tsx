import { createSignal, createEffect, onCleanup, onMount, For, Show, type JSX } from "solid-js";
import { isRtl, t, type Locale } from "@/i18n";
import { localeFromPathname, localizedHref, otherLocale, stripLocale } from "@/lib/navigation";
import { theme, syncThemeFromDom, toggleTheme } from "@/lib/theme";
import { cx } from "@/lib/cx";
import Logo from "./icons/Logo";
import HamburgerIcon from "./icons/HamburgerIcon";
import LocalizationIcon from "./icons/LocalizationIcon";
import ThemeToggleIcon from "./icons/ThemeToggleIcon";
import styles from "./Nav.module.css";

interface NavProps {
  locale: Locale;
  pathname: string;
}

// Link order differs between the mobile menu and the top bar.
const mobileSections = ["works", "blog", "contact", "about"] as const;
const barSections = ["works", "blog", "about", "contact"] as const;

export default function Nav(props: NavProps): JSX.Element {
  // This island's <header> is never re-created by the router (src/lib/router.ts
  // only swaps #app-content), so `props` go stale after the first navigation.
  // Track the live URL in a signal instead, or active-link state and language
  // labels would be wrong on every page after the first.
  const [pathname, setPathname] = createSignal(props.pathname);
  const locale = () => localeFromPathname(pathname());

  onMount(() => {
    setPathname(window.location.pathname);
    const syncPathname = () => setPathname(window.location.pathname);
    // Dispatched by the router right after it swaps #app-content.
    document.addEventListener("app:navigated", syncPathname);
    window.addEventListener("popstate", syncPathname);
    onCleanup(() => {
      document.removeEventListener("app:navigated", syncPathname);
      window.removeEventListener("popstate", syncPathname);
    });
  });

  const messages = () => t(locale()).nav;
  const isPersian = () => isRtl(locale());
  const unprefixedPath = () => stripLocale(pathname());
  const isHomePage = () => unprefixedPath() === "/" || unprefixedPath() === "";
  const href = (path: string) => localizedHref(path, locale());
  const swapLocaleHref = () => localizedHref(unprefixedPath(), otherLocale(locale()));
  // A section stays "current" on its sub-pages too (/works/kazheh -> Works).
  const isActive = (path: string) => {
    const current = unprefixedPath().replace(/\/$/, "");
    return current === path || current.startsWith(`${path}/`);
  };
  const ariaCurrent = (path: string) => (isActive(path) ? "page" : undefined);

  const [isOpen, setIsOpen] = createSignal(false);
  const closeMenu = () => setIsOpen(false);

  // The site is static, so SSR always renders light, and hydration must match:
  // before mount, `isLightMode` is true. The inline <head> script (BaseLayout)
  // has set the real `dark` class by the time we mount, so onMount re-syncs the
  // theme signal and flips `mounted`; `remount` then re-creates the
  // theme-dependent icons.
  const [mounted, setMounted] = createSignal(false);
  const isLightMode = () => (!mounted() || theme() !== "dark");
  const remount = (render: () => JSX.Element) => (
    <Show when={mounted()} fallback={render()}>
      {render()}
    </Show>
  );

  onMount(() => {
    syncThemeFromDom();
    setMounted(true);
  });

  createEffect(() => {
    document.body.style.overflow = isOpen() ? "hidden" : "unset";
    onCleanup(() => {
      document.body.style.overflow = "unset";
    });
  });

  // Hide on scroll down, reveal on scroll up (or when the cursor is over the
  // strip of screen the nav occupies).
  let navRef: HTMLElement | undefined;
  const [isNavHidden, setIsNavHidden] = createSignal(false);
  // An open mobile menu must stay visible: translating <nav> away would also
  // re-anchor the menu's `fixed` children.
  const navHidden = () => isNavHidden() && !isOpen();

  onMount(() => {
    const HIDE_AFTER_PX = 80; // never hide while near the top of the page
    const MIN_DELTA_PX = 6; // ignore scroll jitter smaller than this
    let lastY = window.scrollY;
    let ticking = false;
    // Keeps the nav from hiding underneath a mouse cursor.
    let cursorInNavZone = false;

    const update = () => {
      ticking = false;
      // Clamp so iOS rubber-banding isn't read as a change of direction.
      const maxY = document.documentElement.scrollHeight - window.innerHeight;
      const y = Math.min(Math.max(window.scrollY, 0), Math.max(maxY, 0));

      if (isOpen() || y <= HIDE_AFTER_PX) {
        setIsNavHidden(false);
        lastY = y;
        return;
      }

      const delta = y - lastY;
      if (Math.abs(delta) < MIN_DELTA_PX) return;
      setIsNavHidden(delta > 0 && !cursorInNavZone);
      lastY = y;
    };

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    };

    const onPointerMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" || !navRef) return;
      cursorInNavZone = e.clientY <= navRef.offsetHeight;
      if (cursorInNavZone) setIsNavHidden(false);
    };
    const onPointerLeaveWindow = () => {
      cursorInNavZone = false;
    };

    // The router jumps to the top after swapping content: reset the baseline.
    const onNavigated = () => {
      setIsNavHidden(false);
      lastY = window.scrollY;
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    document.documentElement.addEventListener("mouseleave", onPointerLeaveWindow);
    document.addEventListener("app:navigated", onNavigated);
    onCleanup(() => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pointermove", onPointerMove);
      document.documentElement.removeEventListener("mouseleave", onPointerLeaveWindow);
      document.removeEventListener("app:navigated", onNavigated);
    });
  });

  const logoClass = () =>
    cx(
      styles.logo,
      isOpen() ? styles.logoOpen : styles.logoClosed,
      isOpen() && isPersian() && styles.logoOpenRtl,
    );

  const handleBackdropClick: JSX.EventHandler<HTMLDivElement, MouseEvent> = (e) => {
    if (e.target === e.currentTarget) closeMenu();
  };

  // The theme and language controls exist twice (mobile menu and top bar),
  // differing only in classes and icon size.
  const themeButton = (buttonClass: string, iconClass: string, rotate?: 180) => (
    <button type="button" class={buttonClass} onClick={toggleTheme} aria-label={messages().toggleTheme}>
      {remount(() => (
        <ThemeToggleIcon isLightMode={isLightMode()} rotate={rotate} class={iconClass} />
      ))}
    </button>
  );
  const languageLink = (linkClass: string) => (
    <a href={swapLocaleHref()} class={linkClass} aria-label={messages().toggleLanguage}>
      <LocalizationIcon class={styles.icon} />
    </a>
  );

  return (
    <div class={styles.wrapper}>
      <nav
        ref={navRef}
        class={cx(styles.bar, navHidden() && styles.barHidden)}
        // Keyboard users tabbing into a hidden nav should see where they are.
        onFocusIn={() => setIsNavHidden(false)}
      >
        <div class={styles.row}>
          <a href={href("/")} class={isOpen() ? styles.homeLinkDisabled : ""}>
            {remount(() => (
              <Logo
                isLightMode={isLightMode()}
                isMenuOpen={isOpen()}
                isHomePage={isHomePage()}
                class={logoClass()}
              />
            ))}
          </a>

          <div
            class={cx(styles["mobile-menu-backdrop"], isOpen() && styles.active)}
            onClick={handleBackdropClick}
          />

          <div class={cx(styles["mobile-menu"], isOpen() && styles.active)}>
            <ul class={styles["mobile-menu-links"]}>
              <li>
                <a
                  href={href("/")}
                  aria-current={isHomePage() ? "page" : undefined}
                  onClick={closeMenu}
                >
                  {messages().home}
                </a>
              </li>
              <For each={mobileSections}>
                {(section) => (
                  <li>
                    <a
                      href={href(`/${section}`)}
                      aria-current={ariaCurrent(`/${section}`)}
                      onClick={closeMenu}
                    >
                      {messages()[section]}
                    </a>
                  </li>
                )}
              </For>
            </ul>

            {languageLink(
              cx(
                styles["localization-button"],
                isPersian() && styles["localization-button-rtl"],
                !isOpen() && styles.hideFromSm,
              ),
            )}
            {themeButton(
              cx(
                styles["theme-button"],
                isPersian() && styles["theme-button-rtl"],
                !isOpen() && styles.collapseFromSm,
              ),
              styles.icon,
              180,
            )}
          </div>

          <div class={styles.actions}>
            {themeButton(
              cx(styles.iconButton, styles.collapsed, !isOpen() && styles.expandFromSm),
              styles.iconLg,
            )}
            {languageLink(cx(styles.iconButton, styles.collapsed, !isOpen() && styles.expandFromSm))}
            <button
              type="button"
              class={cx(styles.iconButton, styles.menuToggle, !isOpen() && styles.hideFromSm)}
              onClick={() => setIsOpen(!isOpen())}
              aria-label={messages().toggleMenu}
            >
              <HamburgerIcon isOpen={isOpen()} class={styles.iconMd} />
            </button>
            <div class={cx(styles.links, !isOpen() && styles.linksFromSm)}>
              <ul class={cx(styles.nav, isPersian() ? styles.navFa : styles.navLatin)}>
                <For each={barSections}>
                  {(section) => (
                    <li>
                      <a href={href(`/${section}`)} aria-current={ariaCurrent(`/${section}`)}>
                        {messages()[section]}
                      </a>
                    </li>
                  )}
                </For>
              </ul>
            </div>
          </div>
        </div>
      </nav>
    </div>
  );
}
