import { mountOnNavigate } from "@/lib/autoMount";
import { fitViewport } from "./viewport";
import { pauseWhenNotWatched } from "./timing";

// Imported lazily, so pages without a fabricator never download any of it.
mountOnNavigate(async (isStale) => {
  const stage = document.querySelector<SVGSVGElement>("#fab-stage");
  if (!stage) return;

  const [{ mountChapters }, { chapters }] = await Promise.all([import("./director"), import("./pieces")]);
  if (isStale() || !stage.isConnected) return;

  const fit = new AbortController();
  fitViewport(stage, fit.signal);
  const stop = mountChapters(stage, chapters);
  const unwatch = pauseWhenNotWatched(stage.parentElement ?? stage);
  return () => {
    stop();
    unwatch(); // after stop(): loops frozen by it can then see the abort and unwind
    fit.abort();
  };
});
