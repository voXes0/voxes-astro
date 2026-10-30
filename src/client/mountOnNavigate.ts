/**
 * Runs `mount` after the page loads and after every client-side navigation,
 * tearing the previous mount down first. The router swaps #app-content without
 * running scripts inside it, so a page-level <script> would only run on a full
 * load; each feature has a small loader (src/features/* /entry.ts) that BaseLayout
 * includes once instead. `mount` returns its teardown, and gets `isStale()` to
 * check after any `await`: a newer sync (or a navigation away) happened meanwhile.
 */

type Teardown = () => void;

export function mountOnNavigate(
  mount: (isStale: () => boolean) => Promise<Teardown | undefined>,
): void {
  let teardown: Teardown | undefined;
  let run = 0;

  async function sync() {
    const mine = ++run;
    teardown?.();
    teardown = undefined;
    const next = await mount(() => mine !== run);
    if (mine === run) teardown = next;
  }

  void sync();
  document.addEventListener("app:navigated", () => void sync());
}
